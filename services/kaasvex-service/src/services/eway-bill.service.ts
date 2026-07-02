export interface EWayBillInput {
  transporterName: string;
  transporterId: string;
  vehicleNo: string;
  transportMode: string;
  dispatchLocation: string;
  deliveryLocation: string;
  distanceKm: number;
}

/**
 * Core service to generate and insert E-Way Bill records.
 * Incorporates unique collision prevention with an application-level retry loop.
 * Designed to cleanly wrap potential future real-world GST API integrations.
 */
export const createEWayBillRecord = async (
  tx: any,
  invoiceId: string,
  input: EWayBillInput
) => {
  let attempts = 0;
  let ewayBillNo = '';
  let exists = true;

  while (exists && attempts < 10) {
    attempts++;
    // Generate unique 12-digit E-Way Bill number starting with 541 standard
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    ewayBillNo = `541${randomDigits}`;

    // Application level check to prevent unique constraint failures
    const existingBill = await tx.eWayBill.findUnique({
      where: { ewayBillNo }
    });
    if (!existingBill) {
      exists = false;
    }
  }

  if (exists) {
    throw new Error('Collision safeguard: failed to generate a unique E-Way Bill number after multiple attempts.');
  }

  // Create EWayBill record using transaction client scope
  const bill = await tx.eWayBill.create({
    data: {
      invoiceId,
      ewayBillNo,
      transporterName: input.transporterName,
      transporterId: input.transporterId,
      vehicleNo: input.vehicleNo,
      transportMode: input.transportMode,
      dispatchLocation: input.dispatchLocation,
      deliveryLocation: input.deliveryLocation,
      distanceKm: input.distanceKm,
      status: 'Generated'
    }
  });

  return bill;
};
