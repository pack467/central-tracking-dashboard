import test from "node:test";
import assert from "node:assert/strict";
import { getMonitoringLinks, getMonitoringWebsiteUrl } from "../app/lib/monitoring-links.ts";

test("getMonitoringLinks returns multiple categorized websites for checkpoints", () => {
  const smLinks = getMonitoringLinks("SM", "Queue ActiveMQ 228 · 71 · 68", "tritronik");
  assert.ok(smLinks.length >= 2, "SM has multiple monitoring websites");
  assert.ok(smLinks.some((l) => l.category === "ActiveMQ"), "Includes ActiveMQ console");
  assert.ok(smLinks.some((l) => l.category === "Grafana"), "Includes Grafana dashboard");
  assert.ok(smLinks.some((l) => l.category === "Graylog"), "Includes Graylog stream logs");
  assert.equal(smLinks[0].isPrimary, true, "First link is primary");

  const b2bLinks = getMonitoringLinks("B2B", "Disk usage /apps pv-bbsvsoe1", "tritronik");
  assert.ok(b2bLinks.length >= 2, "B2B has multiple monitoring websites");
  assert.equal(b2bLinks[0].category, "Storage", "Storage link prioritized when task specifies disk usage");
});

test("getMonitoringLinks provides valid client-scoped links for enterprise clients", () => {
  const bniLinks = getMonitoringLinks("BNI Mobile", "Latency login & biometrik user", "bni");
  assert.ok(bniLinks.length >= 2, "BNI Mobile has multiple monitoring websites");
  assert.ok(bniLinks.some((l) => l.url.includes("bni.co.id")), "Contains BNI internal domain");

  const tselLinks = getMonitoringLinks("5G Edge", "Utilisasi UPF gateway regional Jawa", "telkomsel");
  assert.ok(tselLinks.length >= 2, "Telkomsel 5G Edge has multiple monitoring websites");
  assert.ok(tselLinks.some((l) => l.url.includes("telkomsel.co.id")), "Contains Telkomsel internal domain");
});

test("an explicit link is only used when it is a safe address", () => {
  assert.equal(getMonitoringLinks("SM", "", "tritronik", "https://grafana.example.com/d/1")[0].url, "https://grafana.example.com/d/1");
  for (const unsafe of ["javascript:alert(1)", "data:text/html,x", "//evil.example/x"]) {
    assert.ok(!getMonitoringLinks("SM", "", "tritronik", unsafe).some((link) => link.url === unsafe), unsafe);
  }
});

test("getMonitoringWebsiteUrl returns the primary link url as fallback", () => {
  const primaryUrl = getMonitoringWebsiteUrl("SM", "Queue ActiveMQ 228", "tritronik");
  assert.ok(primaryUrl.startsWith("https://"), "Returns valid https URL");
  assert.ok(primaryUrl.includes("activemq"), "Returns ActiveMQ url");
});

