"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { desfavoritarLoja, favoritarLoja, listFavoritos } from "./api";

export function useFavoritoLoja(idLoja: number) {
  const { auth } = useAuth();
  const [favoritado, setFavoritado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!auth) {
      setFavoritado(false);
      return;
    }
    listFavoritos(auth.token).then((favoritos) => {
      setFavoritado(favoritos.some((f) => f.idLoja === idLoja));
    });
  }, [auth, idLoja]);

  const alternar = useCallback(async () => {
    if (!auth || carregando) return;
    setCarregando(true);
    try {
      if (favoritado) {
        await desfavoritarLoja(auth.token, idLoja);
        setFavoritado(false);
      } else {
        await favoritarLoja(auth.token, idLoja);
        setFavoritado(true);
      }
    } finally {
      setCarregando(false);
    }
  }, [auth, carregando, favoritado, idLoja]);

  return { favoritado, alternar, carregando, logado: !!auth };
}
