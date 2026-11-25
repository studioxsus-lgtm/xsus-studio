// @vitest-environment jsdom
import {it, expect} from "vitest";
import {generateWorkerStaticPreview} from "../../services/src/build-worker/static-preview-build.js";
import {generateAndroidGradleProject} from "../../services/src/build-worker/android-gradle-generator.js";

it("preserves a restaurant cart and its confirmed total across reloads", () => {
  const {files} = generateWorkerStaticPreview({name:"[XSUS restaurant orders] Restorant"});
  const source = path => files.find(file=>file.path===path).content;
  function open() {
    document.body.innerHTML = new DOMParser().parseFromString(source("index.html"),"text/html").body.innerHTML;
    new Function(source("main.js"))();
  }
  const click = selector => document.querySelector(selector).click();
  localStorage.clear(); open();
  click('[aria-label="Shto Margherita"]'); click('[aria-label="Shto Tiramisu"]');
  open(); click('[data-page="cart"]');
  expect(document.querySelector("#total").textContent).toBe("Totali: 13.00 €");
  click('[aria-label="Hiq një Tiramisu"]');
  click('#confirm');
  expect(document.querySelector("#history").hidden).toBe(false);
  open(); click('[data-page="history"]');
  expect(document.querySelector("#orders").textContent).toBe("Margherita × 1 · 8.50 €");
  click('[data-page="cart"]'); expect(document.querySelector('#confirm').disabled).toBe(true);
  localStorage.clear();
});

it("builds the restaurant from its own menu and local order store", () => {
  const input={applicationId:"com.xsus.restaurant",displayName:"Restorant"};
  const files=generateAndroidGradleProject(input,{profile:"restaurant_orders",navigation:"bottom_bar"});
  const screen=files.find(file=>file.path.endsWith("/AppScreen.kt")).content;
  expect(screen).toContain("restaurant-v1.json");
  expect(screen).toContain('"Margherita"');
  expect(files.some(file=>file.path.endsWith("/TaskStore.kt"))).toBe(false);
  expect(()=>generateAndroidGradleProject(input,{profile:"restaurant_orders",navigation:"single_screen"})).toThrow();
});
