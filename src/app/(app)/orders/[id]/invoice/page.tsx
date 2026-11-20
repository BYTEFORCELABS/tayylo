"use client";

import { useParams } from "next/navigation";
import { OrderDocumentPage } from "@/components/order/order-document";

export default function OrderInvoicePage() {
  const { id } = useParams<{ id: string }>();
  return <OrderDocumentPage orderId={id} kind="invoice" />;
}
