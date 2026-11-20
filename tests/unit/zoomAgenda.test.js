// Zoom da Agenda da semana (#24): src/utils/zoomAgenda.js
import { describe, it, expect } from "vitest";
import {
  ZOOM_MAX,
  ZOOM_MIN,
  deslocamentoParaFoco,
  limitarZoom,
  textoZoom,
  zoomDaPinca,
  zoomNoPasso,
} from "../../src/utils/zoomAgenda.js";

describe("limitarZoom", () => {
  it("fica entre 100% e 300%", () => {
    expect(limitarZoom(0.5)).toBe(ZOOM_MIN);
    expect(limitarZoom(7)).toBe(ZOOM_MAX);
    expect(limitarZoom(1.5)).toBe(1.5);
  });
  it("lê o valor salvo (string) e descarta lixo", () => {
    expect(limitarZoom("1.75")).toBe(1.75);
    expect(limitarZoom(null)).toBe(1);
    expect(limitarZoom("abc")).toBe(1);
    expect(limitarZoom(NaN)).toBe(1);
    expect(limitarZoom(Infinity)).toBe(1);
  });
  it("arredonda em centésimos", () => {
    expect(limitarZoom(1.23456)).toBe(1.23);
  });
});

describe("zoomDaPinca", () => {
  it("acompanha a abertura dos dedos a partir do zoom inicial", () => {
    expect(zoomDaPinca(1, 100, 200)).toBe(2);
    expect(zoomDaPinca(2, 200, 100)).toBe(1);
    expect(zoomDaPinca(1.5, 100, 150)).toBe(2.25);
  });
  it("respeita os limites", () => {
    expect(zoomDaPinca(1, 100, 50)).toBe(1);
    expect(zoomDaPinca(2, 100, 1000)).toBe(3);
  });
  it("distância inválida não muda o zoom", () => {
    expect(zoomDaPinca(1.5, 0, 100)).toBe(1.5);
    expect(zoomDaPinca(1.5, 100, 0)).toBe(1.5);
  });
});

describe("zoomNoPasso", () => {
  it("anda de 25 em 25%", () => {
    expect(zoomNoPasso(1, 1)).toBe(1.25);
    expect(zoomNoPasso(1.5, -1)).toBe(1.25);
  });
  it("depois de uma pinça, encaixa no múltiplo seguinte", () => {
    expect(zoomNoPasso(1.37, 1)).toBe(1.5);
    expect(zoomNoPasso(1.37, -1)).toBe(1.25);
  });
  it("para nos limites", () => {
    expect(zoomNoPasso(1, -1)).toBe(1);
    expect(zoomNoPasso(3, 1)).toBe(3);
  });
});

describe("deslocamentoParaFoco", () => {
  it("o ponto sob os dedos continua no lugar", () => {
    // Ponto a 200px do início: em 2× ele vai para 400px ⇒ rolar 200px.
    expect(deslocamentoParaFoco(200, 1, 2)).toBe(200);
    expect(deslocamentoParaFoco(400, 2, 1)).toBe(-200);
    expect(deslocamentoParaFoco(0, 1, 3)).toBe(0);
  });
  it("entrada inválida não rola", () => {
    expect(deslocamentoParaFoco(100, 0, 2)).toBe(0);
    expect(deslocamentoParaFoco(NaN, 1, 2)).toBe(0);
  });
});

it("textoZoom", () => {
  expect(textoZoom(1)).toBe("100%");
  expect(textoZoom(1.25)).toBe("125%");
  expect(textoZoom(9)).toBe("300%");
});
