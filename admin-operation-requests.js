(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.YEAdminOperationRequests = api;
})(globalThis, function () {
  const sources = [
    { rpc: 'admin_list_all_operations', args: { p_status: null } },
    { rpc: 'ye_admin_client_requests', args: {} },
    { rpc: 'ye_admin_list_transfers', args: {} },
    { rpc: 'ye_admin_list_entries', args: {} },
    { rpc: 'admin_list_users', args: {} }
  ];
  const pageSize = 500;

  function errorMessage(error) {
    return error && typeof error.message === 'string' ? error.message : String(error);
  }

  function requireRows(response, rpc) {
    if (!response) throw new Error(`${rpc}: risposta Supabase assente`);
    if (response.error) throw new Error(`${rpc}: ${errorMessage(response.error)}`);
    if (!Array.isArray(response.data)) throw new Error(`${rpc}: risposta non valida`);
    return response.data;
  }

  function validateRows(rows, rpc, idField = 'id') {
    if (rows.some(row => !row || typeof row !== 'object' || row[idField] == null)) {
      throw new Error(`${rpc}: record non valido`);
    }
    return rows;
  }

  function labelFor(userId, email, usersById) {
    const user = usersById.get(userId);
    const name = String(user?.display_name || '').trim();
    const address = String(email || user?.email || '').trim();
    if (name && address && name.toLocaleLowerCase() !== address.toLocaleLowerCase()) {
      return `${name} (${address})`;
    }
    return name || address || userId || '—';
  }

  function operationType(value) {
    if (value === 'withdraw') return 'withdrawal';
    if (value === 'deposit_request') return 'deposit';
    return value;
  }

  function normalizeRequest(row, source, usersById, overrides = {}) {
    const userId = overrides.userId ?? row.user_id;
    return {
      ...row,
      source,
      sourceId: row.id,
      user_id: userId,
      client: overrides.client || labelFor(userId, row.email, usersById),
      operation_type: operationType(overrides.operationType || row.operation_type || row.kind),
      status: overrides.status || row.status,
      operation_date: row.operation_date || row.created_at
    };
  }

  function sortByDate(rows) {
    return rows.sort((a, b) => {
      const aTime = Date.parse(a.operation_date);
      const bTime = Date.parse(b.operation_date);
      const aValid = Number.isFinite(aTime);
      const bValid = Number.isFinite(bTime);
      if (!aValid && !bValid) return 0;
      if (!aValid) return 1;
      if (!bValid) return -1;
      return bTime - aTime;
    });
  }

  async function load(rpc) {
    if (typeof rpc !== 'function') throw new TypeError('È necessario fornire il lettore RPC Supabase.');

    const results = await Promise.all(sources.map(async source => {
      try {
        const idField = source.rpc === 'admin_list_users' ? 'user_id' : 'id';
        const rows = [];
        const seen = new Set();
        for (let from = 0; ; from += pageSize) {
          const response = await rpc(source.rpc, source.args, { from, to: from + pageSize - 1 });
          const page = validateRows(requireRows(response, source.rpc), source.rpc, idField);
          if (page.length > pageSize) {
            throw new Error(`${source.rpc}: il server non ha rispettato la paginazione`);
          }
          for (const row of page) {
            if (seen.has(row[idField])) {
              throw new Error(`${source.rpc}: la paginazione ha restituito record duplicati`);
            }
            seen.add(row[idField]);
          }
          rows.push(...page);
          if (page.length < pageSize) break;
        }
        return { source, rows };
      } catch (error) {
        return { source, error: errorMessage(error) };
      }
    }));

    const rowsByRpc = new Map(results.filter(result => !result.error)
      .map(result => [result.source.rpc, result.rows]));
    const errors = results.filter(result => result.error)
      .map(result => ({ rpc: result.source.rpc, message: result.error }));
    const usersById = new Map((rowsByRpc.get('admin_list_users') || [])
      .map(user => [user.user_id, user]));
    const rows = [];

    try {
      for (const row of rowsByRpc.get('admin_list_all_operations') || []) {
        rows.push(normalizeRequest(row, 'operation_requests', usersById));
      }
    } catch (error) {
      errors.push({ rpc: 'admin_list_all_operations', message: errorMessage(error) });
    }

    try {
      for (const row of rowsByRpc.get('ye_admin_client_requests') || []) {
        rows.push(normalizeRequest(row, 'ye_client_requests', usersById));
      }
    } catch (error) {
      errors.push({ rpc: 'ye_admin_client_requests', message: errorMessage(error) });
    }

    try {
      for (const row of rowsByRpc.get('ye_admin_list_transfers') || []) {
        const from = labelFor(row.from_user_id, null, usersById);
        const to = labelFor(row.to_user_id, null, usersById);
        rows.push(normalizeRequest(row, 'ye_admin_transfers', usersById, {
          userId: row.from_user_id,
          client: `${from} → ${to}`,
          operationType: 'transfer',
          status: 'completed'
        }));
      }
    } catch (error) {
      errors.push({ rpc: 'ye_admin_list_transfers', message: errorMessage(error) });
    }

    try {
      for (const row of rowsByRpc.get('ye_admin_list_entries') || []) {
        if (row.kind === 'deposit_request') {
          rows.push(normalizeRequest(row, 'ye_admin_entries', usersById, {
            operationType: 'deposit'
          }));
        }
      }
    } catch (error) {
      errors.push({ rpc: 'ye_admin_list_entries', message: errorMessage(error) });
    }

    const limitWarnings = results
      .filter(result => !result.error && result.source.limit && result.rows.length >= result.source.limit)
      .map(result => ({ rpc: result.source.rpc, limit: result.source.limit }));

    return { rows: sortByDate(rows), errors, limitWarnings };
  }

  return { load };
});
