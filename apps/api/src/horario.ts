interface HorarioDb {
  diaSemana: number;
  abreEm: string | null;
  fechaEm: string | null;
  fechado: boolean;
}

interface FechamentoDb {
  inicio: Date;
  fim: Date;
}

function paraMinutos(horaMinuto: string) {
  const [h, m] = horaMinuto.split(":").map(Number);
  return h * 60 + m;
}

// diaSemana segue Date.getDay(): 0=domingo .. 6=sábado, igual à coluna dia_semana.
export function lojaEstaAberta(horarios: HorarioDb[], fechamentos: FechamentoDb[], agora = new Date()): boolean {
  if (fechamentos.some((f) => agora >= f.inicio && agora <= f.fim)) return false;

  const horario = horarios.find((h) => h.diaSemana === agora.getDay());
  if (!horario || horario.fechado || !horario.abreEm || !horario.fechaEm) return false;

  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const minutosAbre = paraMinutos(horario.abreEm);
  const minutosFecha = paraMinutos(horario.fechaEm);

  if (minutosFecha > minutosAbre) {
    // Não cruza a meia-noite (ex: 09:00–22:00)
    return minutosAgora >= minutosAbre && minutosAgora < minutosFecha;
  }
  // Cruza a meia-noite (ex: 18:00–02:00)
  return minutosAgora >= minutosAbre || minutosAgora < minutosFecha;
}
