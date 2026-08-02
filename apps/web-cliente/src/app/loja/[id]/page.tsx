import { LojaClient } from "./loja-client";

export default async function LojaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LojaClient idLoja={id} />;
}
