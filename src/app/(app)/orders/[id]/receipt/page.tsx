"use client";

import { useParams } from "next/navigation";
import { OrderDocumentPage } from "@/components/order/order-document";

export default function OrderReceiptPage() {
  const { id } = useParams<{ id: string }>();
  return <OrderDocumentPage orderId={id} kind="receipt" />;
}
