import { PedidoClient } from "./pedido-client";

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PedidoClient idPedido={id} />;
}
