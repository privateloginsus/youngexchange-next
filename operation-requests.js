(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.YEOperationRequests = api;
})(globalThis, function () {
  const currencies = new Set(['EUR', 'BTC', 'ETH', 'USDT']);
  const kinds = new Set(['deposit', 'withdraw', 'transfer', 'swap', 'buy', 'sell']);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function createPayload(input) {
    const type = String(input.type || '');
    const currency = String(input.currency || '');
    const amount = String(input.amount ?? '').trim();
    const destination = String(input.destination || '').trim();
    const target = String(input.target || '');
    const reference = String(input.reference || '').trim();
    const idempotencyKey = String(input.idempotencyKey || '');

    if (!kinds.has(type)) throw new Error('Tipo di operazione non valido.');
    if (!currencies.has(currency)) throw new Error('Valuta non supportata.');
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(amount)) throw new Error('Importo non valido.');
    const [whole = '0', fraction = ''] = amount.split('.');
    const normalizedWhole = whole.replace(/^0+/, '') || '0';
    const exceedsLimit = normalizedWhole.length > 10 ||
      (normalizedWhole.length === 10 && normalizedWhole > '1000000000') ||
      (normalizedWhole === '1000000000' && /[1-9]/.test(fraction));
    if (exceedsLimit || !/[1-9]/.test(normalizedWhole + fraction)) throw new Error('Importo non valido.');
    if (!uuidPattern.test(idempotencyKey)) throw new Error('Chiave idempotente non valida.');
    if (reference.length > 150) throw new Error('Riferimento troppo lungo.');
    if (type === 'transfer' && !uuidPattern.test(destination)) throw new Error('Inserisci l’ID valido del conto destinatario.');
    if (type === 'withdraw' && !destination) throw new Error('Inserisci l’IBAN o la destinazione del prelievo.');
    if (['swap', 'buy', 'sell'].includes(type) && (!currencies.has(target) || target === currency)) {
      throw new Error('Seleziona una valuta di destinazione diversa da quella di origine.');
    }

    return {
      p_kind: type,
      p_currency: currency,
      p_amount: amount,
      p_destination: destination,
      p_target: target,
      p_reference: reference,
      p_idempotency_key: idempotencyKey
    };
  }

  function createReviewPayload(input) {
    const requestId = String(input.requestId || '');
    const decision = String(input.decision || '');
    const kind = String(input.kind || '');
    const depositVerified = input.depositVerified === true;
    const externalReference = String(input.externalReference || '').trim();
    if (!uuidPattern.test(requestId)) throw new Error('ID richiesta non valido.');
    if (!['approved', 'rejected'].includes(decision)) throw new Error('Decisione non valida.');
    if (!kinds.has(kind)) throw new Error('Tipo di operazione non valido.');
    if (kind === 'deposit' && decision === 'approved' &&
        (!depositVerified || externalReference.length < 1 || externalReference.length > 200)) {
      throw new Error('La verifica del deposito e il riferimento esterno sono obbligatori.');
    }
    return {
      p_request_id: requestId,
      p_decision: decision,
      p_deposit_verified: depositVerified,
      p_external_reference: externalReference || null
    };
  }

  function createWithdrawalSettlementPayload(input) {
    const requestId = String(input.requestId || '');
    const result = String(input.result || '');
    const externalReference = String(input.externalReference || '').trim();
    if (!uuidPattern.test(requestId)) throw new Error('ID richiesta non valido.');
    if (!['confirmed', 'failed'].includes(result)) throw new Error('Esito del prelievo non valido.');
    if (externalReference.length < 1 || externalReference.length > 200) {
      throw new Error('Il riferimento o la motivazione dell’esito è obbligatorio (1-200 caratteri).');
    }
    return {
      p_request_id: requestId,
      p_external_result: result,
      p_external_reference: externalReference
    };
  }

  function createQuotePayload(input) {
    const sourceCurrency = String(input.sourceCurrency || '');
    const targetCurrency = String(input.targetCurrency || '');
    const sourceAmount = String(input.sourceAmount ?? '').trim();
    const idempotencyKey = String(input.idempotencyKey || '');
    if (!currencies.has(sourceCurrency) || !currencies.has(targetCurrency) ||
        sourceCurrency === targetCurrency) {
      throw new Error('Valute della quotazione non valide.');
    }
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(sourceAmount) || Number(sourceAmount) <= 0) {
      throw new Error('Importo della quotazione non valido.');
    }
    if (!uuidPattern.test(idempotencyKey)) throw new Error('Chiave quotazione non valida.');
    return {
      p_source_currency: sourceCurrency,
      p_target_currency: targetCurrency,
      p_source_amount: sourceAmount,
      p_idempotency_key: idempotencyKey
    };
  }

  function createQuotedRequestPayload(input) {
    const requestId = String(input.requestId || '');
    const quoteId = String(input.quoteId || '');
    const kind = String(input.type || '');
    const currency = String(input.currency || '');
    const amount = String(input.amount ?? '').trim();
    const target = String(input.target || '');
    if (!['swap', 'buy', 'sell'].includes(kind)) throw new Error('Tipo di conversione non valido.');
    if (!uuidPattern.test(requestId) || !uuidPattern.test(quoteId)) {
      throw new Error('Riferimento della quotazione non valido.');
    }
    if (input.acceptQuote !== true) throw new Error('Conferma la quotazione prima di procedere.');
    if (!currencies.has(currency) || !currencies.has(target) || currency === target ||
        !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(amount) || Number(amount) <= 0) {
      throw new Error('Parametri della conversione non validi.');
    }
    return {
      p_kind: kind,
      p_currency: currency,
      p_amount: amount,
      p_target: target,
      p_reference: String(input.reference || '').trim(),
      p_quote_id: quoteId,
      p_idempotency_key: requestId,
      p_accept_quote: input.acceptQuote === true
    };
  }

  return {
    createPayload,
    createReviewPayload,
    createWithdrawalSettlementPayload,
    createQuotePayload,
    createQuotedRequestPayload
  };
});