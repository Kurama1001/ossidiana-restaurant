import { base44 } from '@/api/base44Client';

/**
 * Calcola lo stato di consegna aggregato per un gruppo di righe (fase).
 */
function computeDeliveryStatus(stati) {
  if (!stati || stati.length === 0) return null;
  if (stati.every(s => s === 'pronto' || s === 'consegnato')) return 'completato';
  if (stati.some(s => s === 'in_preparazione')) return 'in_preparazione';
  if (stati.some(s => s === 'ricevuto')) return 'ricevuto';
  return stati[0];
}

/**
 * Costruisce il payload JSON della comanda per il PrintJob.
 * Mantiene lo stesso raggruppamento per fase e filtro reparto gia esistenti.
 *
 * @param {Object} params
 * @param {string} params.ordineId
 * @param {number|string} params.numeroTavolo
 * @param {number} params.coperti
 * @param {string} params.noteGenerali
 * @param {Object} params.user - utente corrente (id, full_name, email)
 * @param {Array}  params.righe - righe della comanda
 * @param {string} params.createdAt - timestamp ISO
 * @param {string} params.repartoFilter - 'cucina' per filtrare, null per tutto
 * @param {boolean} params.isAddition - true per aggiunta a comanda esistente
 * @param {boolean} params.isReprint - true per ristampa manuale
 * @returns {Object} payload JSON
 */
export function buildPrintPayload({ ordineId, numeroTavolo, coperti, noteGenerali, user, righe, createdAt, repartoFilter = 'cucina', isAddition = false, isReprint = false }) {
  const righeStampa = repartoFilter ? righe.filter(r => r.reparto === repartoFilter) : righe;

  const fasiUsate = [...new Set(righeStampa.map(r => r.fase || 1))].sort((a, b) => a - b);

  const phases = fasiUsate.map(f => {
    const righeFase = righeStampa.filter(r => (r.fase || 1) === f);
    const stati = righeFase.map(r => r.stato || 'inviato');
    return {
      phase_name: `Fase ${f}`,
      delivery_status: computeDeliveryStatus(stati),
      items: righeFase.map(r => ({
        row_id: r.id || null,
        quantity: r.quantita,
        name: r.nome_item,
        variants: [],
        notes: r.note || '',
        status: r.stato || 'inviato',
        priority: r.priorita || 'normale',
      })),
    };
  });

  const result = {
    order_id: ordineId || null,
    order_number: null,
    table: numeroTavolo != null ? String(numeroTavolo) : null,
    operator: user?.full_name || user?.email || null,
    created_at: createdAt || new Date().toISOString(),
    general_notes: noteGenerali || '',
    coperti: coperti || 0,
    phases,
  };
  if (isAddition) {
    result.is_addition = true;
    result.addition_label = 'AGGIUNTA ALLA COMANDA';
  }
  if (isReprint) {
    result.is_reprint = true;
    result.reprint_label = 'RISTAMPA COMANDA';
  }
  return result;
}

/**
 * Crea un record PrintJob in coda per la stampante cucina.
 * Sostituisce window.print() / popup browser / connessioni TCP.
 *
 * @param {Object} payload - snapshot JSON della comanda
 * @param {string} orderId - ID dell'Ordine
 * @param {Object} user - utente corrente
 * @param {string} jobType - 'kitchen_order' | 'kitchen_order_addition' | 'kitchen_order_reprint'
 * @returns {Promise<Object>} il PrintJob creato
 */
export async function createKitchenPrintJob(payload, orderId, user, jobType = 'kitchen_order') {
  return await base44.entities.PrintJob.create({
    job_type: jobType,
    status: 'pending',
    target_printer: 'kitchen',
    order_id: orderId || '',
    payload,
    attempts: 0,
    created_by_user_id: user?.id || '',
  });
}

/**
 * Crea un PrintJob di test per verificare la connettivita del Print Bridge.
 *
 * @param {Object} user - utente corrente
 * @returns {Promise<Object>} il PrintJob creato
 */
export async function createTestPrintJob(user) {
  const payload = {
    title: 'OSSIDIANA',
    message: 'Test stampa da Base44',
    created_at: new Date().toISOString(),
  };
  return await base44.entities.PrintJob.create({
    job_type: 'test',
    status: 'pending',
    target_printer: 'kitchen',
    order_id: '',
    payload,
    attempts: 0,
    created_by_user_id: user?.id || '',
  });
}