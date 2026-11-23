// src/hooks/useFaxinaArquivos.js
// Apaga do Storage os arquivos de certificados que estão na lixeira há mais
// de DIAS_LIXEIRA dias. Uma vez por sessão, e só com o estado CONFIRMADO pelo
// servidor (`sincronizado`): com dados velhos do cache poderia apagar um
// arquivo que outro aparelho acabou de recuperar com o Desfazer.
import { useEffect, useRef } from "react";
import { apagarArquivo } from "../arquivos";
import { arquivosVencidos, tirarDaLixeira } from "../utils/certificados";

export default function useFaxinaArquivos({ uid, data, sincronizado, persist }) {
  const feitaRef = useRef(false);
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  useEffect(() => {
    if (feitaRef.current || !uid || !data || !sincronizado) return;
    feitaRef.current = true;
    const vencidos = arquivosVencidos(data, Date.now());
    if (vencidos.length === 0) return;
    (async () => {
      const apagados = [];
      for (const caminho of vencidos) {
        if (await apagarArquivo(caminho)) apagados.push(caminho);
      }
      // O que falhou (offline…) continua na lixeira para a próxima sessão.
      if (apagados.length) persistRef.current((d) => tirarDaLixeira(d, apagados));
    })();
  }, [uid, data, sincronizado]);
}
