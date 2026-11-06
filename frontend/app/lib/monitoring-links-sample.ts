import type { MonitoringLinkItem } from "./monitoring-links";

/** Sample links for demos and development. A normal production build leaves this file out of the bundle (see monitoring-links.ts). */
export const SAMPLE_LINKS_BY_CLIENT: Record<string, Record<string, MonitoringLinkItem[]>> = {
  tritronik: {
    sm: [
      {
        id: "ttn-sm-activemq",
        title: "ActiveMQ Web Console (Queues & Subscribers)",
        url: "https://activemq.tritronik.internal/admin/queues.jsp",
        category: "ActiveMQ",
        description: "Monitoring queue fulldecode smng109, dead letter queue (DLQ), dan pending consumer.",
        isPrimary: true,
      },
      {
        id: "ttn-sm-grafana",
        title: "Grafana ActiveMQ Broker Health & Throughput",
        url: "https://grafana.tritronik.internal/d/activemq-metrics/broker-health",
        category: "Grafana",
        description: "Metrik throughput pesan per detik, dequeue rate, dan konsumsi memori JVM broker.",
      },
      {
        id: "ttn-sm-graylog",
        title: "Graylog Stream - Service Management Logs",
        url: "https://graylog.tritronik.internal/streams/sm-activemq/search",
        category: "Graylog",
        description: "Live search error log, broker timeout, dan connection drop stream SM.",
      },
    ],
    b2b: [
      {
        id: "ttn-b2b-kafka",
        title: "Kafka UI - B2B Topics & Consumer Groups",
        url: "https://kafka-ui.tritronik.internal/ui/clusters/b2b-prod/topics",
        category: "Kafka",
        description: "Inspeksi traffic topik Kafka, partition offset, dan consumer lag partner B2B.",
        isPrimary: true,
      },
      {
        id: "ttn-b2b-disk",
        title: "Grafana Node Exporter - Disk Usage /apps pv-bbsvsoe1",
        url: "https://grafana.tritronik.internal/d/b2b-storage/disk-usage",
        category: "Storage",
        description: "Monitoring kapasitas disk storage mount /apps, disk I/O, dan temporary clean-up.",
      },
      {
        id: "ttn-b2b-gateway",
        title: "B2B Partner Ingress & API Gateway Dashboard",
        url: "https://monitoring.tritronik.internal/d/b2b-main/overview",
        category: "APM",
        description: "Metrik throughput transaksi perbankan, latensi partner, dan status HTTP 2xx/5xx.",
      },
    ],
    usiem: [
      {
        id: "ttn-usiem-graylog",
        title: "Graylog SIEM Ingest Stream (Live)",
        url: "https://graylog.tritronik.internal/streams/usiem-prod/search",
        category: "Graylog",
        description: "Monitoring live ingest stream SIEM throughput 45.000 msg/s dan buffer memory.",
        isPrimary: true,
      },
      {
        id: "ttn-usiem-elastic",
        title: "Grafana Elasticsearch & Storage Health",
        url: "https://grafana.tritronik.internal/d/usiem-elastic/cluster-overview",
        category: "Grafana",
        description: "Status kesehatan Elasticsearch cluster, sharding index, dan utilisasi heap node.",
      },
      {
        id: "ttn-usiem-rules",
        title: "SIEM Security Rule & Alert Manager",
        url: "https://siem.tritronik.internal/alerts/active",
        category: "Console",
        description: "Pusat verifikasi korelasi ancaman dan status notifikasi webhook security.",
      },
    ],
    epc: [
      {
        id: "ttn-epc-grafana",
        title: "Grafana EPC Core - Catalog & Order Services",
        url: "https://grafana.tritronik.internal/d/epc-core/catalog-order-service",
        category: "Grafana",
        description: "Response time P95/P99 pod catalog & order, error rate, dan throughput order.",
        isPrimary: true,
      },
      {
        id: "ttn-epc-k8s",
        title: "Kubernetes Pods & Container Workload",
        url: "https://k8s.tritronik.internal/workloads/epc-catalog-pods",
        category: "Console",
        description: "Status container pods, memory usage limit, dan event crashloop restart pod.",
      },
      {
        id: "ttn-epc-tracing",
        title: "Jaeger APM Distributed Tracing",
        url: "https://apm.tritronik.internal/jaeger/search?service=epc-catalog",
        category: "APM",
        description: "Trace latensi inter-service antar microservice catalog, pricing, dan cart.",
      },
    ],
    aph: [
      {
        id: "ttn-aph-grafana",
        title: "Grafana APH PoP Traffic & Output Rate",
        url: "https://grafana.tritronik.internal/d/aph-pop/output-consumer-rate",
        category: "Grafana",
        description: "Monitoring throughput data PoP 1-4, average 12.4k req/sec, dan listener rate.",
        isPrimary: true,
      },
      {
        id: "ttn-aph-gateway",
        title: "CGNAT Gateway & Area Interconnection",
        url: "https://netmon.tritronik.internal/d/aph/gateway-traffic",
        category: "Network",
        description: "Egress listener throttling, rebalance status, dan packet rate Area 1 CGNAT.",
      },
    ],
    dm: [
      {
        id: "ttn-dm-quota",
        title: "DM Portal - Device Quota LintasArta",
        url: "https://dm.tritronik.internal/quota/lintasarta",
        category: "Portal",
        description: "Sinkronisasi status quota harian perangkat telekomunikasi LintasArta.",
        isPrimary: true,
      },
      {
        id: "ttn-dm-grafana",
        title: "Grafana Host CPU & Memory Utilization",
        url: "https://grafana.tritronik.internal/d/dm-core/cpu-utilization",
        category: "Grafana",
        description: "Utilisasi CPU core server DM, memory headroom, dan load average node.",
      },
    ],
    unem: [
      {
        id: "ttn-unem-grafana",
        title: "Grafana UNEM Main Dashboard & Cluster Alerts",
        url: "https://grafana.tritronik.internal/d/unem-main/services-alerts",
        category: "Grafana",
        description: "Dashboard monitoring kesehatan layanan UNEM, latency P95 di bawah 120ms.",
        isPrimary: true,
      },
      {
        id: "ttn-unem-prometheus",
        title: "Prometheus Alertmanager UI",
        url: "https://alerts.tritronik.internal/alerts",
        category: "Console",
        description: "Pemeriksaan alert rules, firing alerts, dan status silencing notifikasi.",
      },
    ],
    mb: [
      {
        id: "ttn-mb-grafana",
        title: "Grafana Push Notification Queue",
        url: "https://monitoring.tritronik.internal/d/mb-push/notification-queue",
        category: "Grafana",
        description: "Monitoring antrian pengiriman push notifikasi dan delivery rate 99.8%.",
        isPrimary: true,
      },
      {
        id: "ttn-mb-gateway",
        title: "Mobile Push Notification Gateway Console",
        url: "https://push-gateway.tritronik.internal/stats",
        category: "APM",
        description: "Throughput notifikasi 8.200 push/menit, FCM & APNS connection sockets.",
      },
    ],
    handover: [
      {
        id: "ttn-handover-log",
        title: "Shift Handover Operations Portal",
        url: "https://monitoring.tritronik.internal/shift-handover",
        category: "Portal",
        description: "Portal kesiapan serah terima operasional antar shift dan catatan insiden.",
        isPrimary: true,
      },
    ],
  },
  bni: {
    "bni mobile": [
      {
        id: "bni-mobile-apm",
        title: "Dynatrace APM - BNI Mobile Biometric & Auth",
        url: "https://apm.bni.co.id/d/bni-mobile/auth-biometric",
        category: "APM",
        description: "Monitoring latensi verifikasi biometrik face/fingerprint dan API login pengguna.",
        isPrimary: true,
      },
      {
        id: "bni-mobile-k8s",
        title: "Kubernetes Cluster Auth Microservice Pods",
        url: "https://k8s.bni.co.id/pods/bni-mobile-auth",
        category: "Console",
        description: "Status replika container pod auth cluster 02 dan connection pool database.",
      },
    ],
    "switching atm": [
      {
        id: "bni-atm-netmon",
        title: "NetMon ATM Leased-Line Link Telemetry",
        url: "https://netmon.bni.co.id/d/switching-atm/leased-line",
        category: "Network",
        description: "Uptime koneksi leased-line antar cabang dan switch ATM regional 03.",
        isPrimary: true,
      },
      {
        id: "bni-atm-switch",
        title: "ISO-8583 Core Switching Gateway Console",
        url: "https://switch.bni.co.id/monitoring/atm-clusters",
        category: "Console",
        description: "Jaringan router ATM interkoneksi antar-bank dan throughput transaksi.",
      },
    ],
    "qris settle": [
      {
        id: "bni-qris-kafka",
        title: "Kafka UI - Topic qris-clearing & Partitions",
        url: "https://kafka-ui.bni.co.id/ui/clusters/qris-settle/topics",
        category: "Kafka",
        description: "Antrian transaksi kliring QRIS merchant dan pemantauan consumer lag.",
        isPrimary: true,
      },
      {
        id: "bni-qris-portal",
        title: "BNI Merchant Settlement Balancing Portal",
        url: "https://clearing.bni.co.id/settlement/batch-monitor",
        category: "Portal",
        description: "Validasi batch settlement malam dan saldo kliring BI-FAST pedagang.",
      },
    ],
    openbanking: [
      {
        id: "bni-openbank-gateway",
        title: "OpenBanking API Gateway & Token TPS Dashboard",
        url: "https://apm.bni.co.id/d/openbanking/gateway-tps",
        category: "APM",
        description: "Gateway TPS, masa berlaku token auth partner fintech, dan error rate.",
        isPrimary: true,
      },
      {
        id: "bni-openbank-waf",
        title: "WAF & Security Group Whitelist Management",
        url: "https://developer.bni.co.id/ops/rate-limits",
        category: "Console",
        description: "Pendaftaran CIDR subnet partner pembayaran digital dan rate limit WAF.",
      },
    ],
    "core banking": [
      {
        id: "bni-core-apm",
        title: "Core Banking Pre-EOD Readiness & Thread Pool",
        url: "https://apm.bni.co.id/d/core-banking/eod-readiness",
        category: "APM",
        description: "Kapasitas thread pool basis data core banking menjelang batch EOD malam.",
        isPrimary: true,
      },
      {
        id: "bni-core-ledger",
        title: "Branch Ledger Balancing & Database Replication",
        url: "https://dbmon.bni.co.id/clusters/core-banking-dr",
        category: "Storage",
        description: "Replikasi sinkronisasi antar cluster aktif dan standby buku akhir bulan.",
      },
    ],
    "fraud shield": [
      {
        id: "bni-fraud-siem",
        title: "Fraud Shield Anomaly Scoring & Threat Center",
        url: "https://siem.bni.co.id/d/fraud-shield/anomaly-score",
        category: "Graylog",
        description: "AI anomaly detection scoring transaksi mencurigakan dan terminal internasional.",
        isPrimary: true,
      },
    ],
    "card mgmt": [
      {
        id: "bni-card-sync",
        title: "Card Management Bin-Range Database Sync",
        url: "https://apm.bni.co.id/d/card-mgmt/bin-range-sync",
        category: "APM",
        description: "Sinkronisasi bin-range kartu kredit dan klaster operasional perbankan.",
        isPrimary: true,
      },
    ],
  },
  telkomsel: {
    mytelkomsel: [
      {
        id: "tsel-app-grafana",
        title: "Grafana MyTelkomsel API & Katalog Response Time",
        url: "https://grafana.telkomsel.co.id/d/mytelkomsel/catalog-payment",
        category: "Grafana",
        description: "Monitoring response time katalog paket data stabil di bawah 450ms.",
        isPrimary: true,
      },
      {
        id: "tsel-app-gateway",
        title: "Payment Channel & E-Wallet Gateway Health",
        url: "https://apm.telkomsel.co.id/mytelkomsel/payment-callback",
        category: "APM",
        description: "Tingkat keberhasilan callback transaksi QRIS dan voucher e-wallet 99.9%.",
      },
    ],
    "5g edge": [
      {
        id: "tsel-5g-netmon",
        title: "NetMon 5G UPF Gateway Regional Jawa",
        url: "https://netmon.telkomsel.co.id/d/5g-edge/upf-gateway",
        category: "Network",
        description: "Utilisasi UPF user plane, throughput 6.2 Gbps tanpa packet drop.",
        isPrimary: true,
      },
      {
        id: "tsel-5g-gnodeb",
        title: "Control-Plane Radio gNodeB Latency Monitor",
        url: "https://ranmon.telkomsel.co.id/control-plane/latency",
        category: "Network",
        description: "Latency sinyal kontrol radio gNodeB area urban dan slice event.",
      },
    ],
    "ocs billing": [
      {
        id: "tsel-ocs-grafana",
        title: "Grafana OCS Diameter Charging Round-Trip",
        url: "https://grafana.telkomsel.co.id/d/ocs-billing/diameter-charging",
        category: "Grafana",
        description: "Waktu respons Diameter CCR/CCA dan latensi pemotongan pulsa/kuota.",
        isPrimary: true,
      },
      {
        id: "tsel-ocs-cdr",
        title: "CDR Stream Real-Time Throttle Engine",
        url: "https://billing.telkomsel.co.id/cdr-stream/throughput",
        category: "Console",
        description: "Audit kapasitas pemrosesan charging panggilan, SMS, dan data pelanggan.",
      },
    ],
    "vas gateway": [
      {
        id: "tsel-vas-activemq",
        title: "ActiveMQ VAS Broadcast & Notifikasi Queue",
        url: "https://activemq.telkomsel.co.id/admin/vas-broadcast",
        category: "ActiveMQ",
        description: "Antrian pesan broadcast promo dan informasi SMS gateway pelanggan.",
        isPrimary: true,
      },
    ],
    "smsc core": [
      {
        id: "tsel-smsc-routing",
        title: "NetMon SMSC Routing MT/MO 18k TPS",
        url: "https://netmon.telkomsel.co.id/d/smsc-core/mt-mo-routing",
        category: "Network",
        description: "Routing throughput MT/MO dan audit buffer OTP banking via SMS.",
        isPrimary: true,
      },
    ],
    "ussd *363#": [
      {
        id: "tsel-ussd-backlog",
        title: "NetMon USSD Gateway Interactive Menu Session",
        url: "https://netmon.telkomsel.co.id/d/ussd-363/session-backlog",
        category: "Network",
        description: "Backlog sesi menu interaktif USSD pada layer HLR gateway peak hour.",
        isPrimary: true,
      },
    ],
    "hlr/hss": [
      {
        id: "tsel-hlr-sync",
        title: "NetMon HLR/HSS Subscriber Database Replication",
        url: "https://netmon.telkomsel.co.id/d/hlr-hss/subscriber-replication",
        category: "Storage",
        description: "Replikasi profil pelanggan node 04 antar cluster aktif dan standby.",
        isPrimary: true,
      },
    ],
  },
  mandiri: {
    "livin' superapp": [
      {
        id: "bmri-livin-apm",
        title: "Dynatrace APM - Livin' Superapp Gateway TPS",
        url: "https://apm.bankmandiri.co.id/d/livin/gateway-tps",
        category: "APM",
        description: "Traffic stabil 24k TPS dan response time token auth pengguna.",
        isPrimary: true,
      },
    ],
    "mandiri switcher": [
      {
        id: "bmri-switch-netmon",
        title: "NetMon Interbank Switching Latency Monitor",
        url: "https://netmon.bankmandiri.co.id/d/switcher/interbank-latency",
        category: "Network",
        description: "Pemantauan latensi interbank switching jam transaksi malam.",
        isPrimary: true,
      },
    ],
    "bi-fast mandiri": [
      {
        id: "bmri-bifast-apm",
        title: "BI-FAST Settlement Clearing Queue Dashboard",
        url: "https://apm.bankmandiri.co.id/d/bi-fast/clearing-queue",
        category: "APM",
        description: "Direct settlement clearing queue dan koneksi RTGS Bank Indonesia.",
        isPrimary: true,
      },
    ],
  },
  bca: {
    mybca: [
      {
        id: "bca-mybca-apm",
        title: "Dynatrace APM - myBCA OAuth Gateway Performance",
        url: "https://apm.bca.co.id/d/mybca/oauth-gateway",
        category: "APM",
        description: "Single identity OAuth verification, response time auth normal 180ms.",
        isPrimary: true,
      },
    ],
    "switching kliring": [
      {
        id: "bca-kliring-netmon",
        title: "NetMon Switching Kliring RTGS & SKN",
        url: "https://netmon.bca.co.id/d/kliring/rtgs-skn",
        category: "Network",
        description: "Antrian pesan switching kliring dan interkoneksi Bank Indonesia.",
        isPrimary: true,
      },
    ],
  },
  indosat: {
    "im3 network": [
      {
        id: "isat-im3-netmon",
        title: "NetMon IM3 User Plane & Packet Drop Monitor",
        url: "https://netmon.ioh.co.id/d/im3/user-plane",
        category: "Network",
        description: "Throughput paket stabil dan packet data routing nasional.",
        isPrimary: true,
      },
    ],
    "core 4g/5g": [
      {
        id: "isat-core-netmon",
        title: "NetMon MME Connection Pool Regional Jawa",
        url: "https://netmon.ioh.co.id/d/core-4g5g/mme-pool",
        category: "Network",
        description: "Monitoring utilisasi kapasitas dan load balance MME cluster node.",
        isPrimary: true,
      },
    ],
  },
  xl: {
    myxl: [
      {
        id: "xl-myxl-grafana",
        title: "Grafana myXL Self-Service API Performance",
        url: "https://grafana.xl.co.id/d/myxl/self-service-api",
        category: "Grafana",
        description: "API service nominal dan verifikasi autentikasi pelanggan.",
        isPrimary: true,
      },
    ],
    "xl satu fiber": [
      {
        id: "xl-fiber-netmon",
        title: "NetMon GPON OLT Uplink Telemetry",
        url: "https://netmon.xl.co.id/d/xl-satu/gpon-olt",
        category: "Network",
        description: "Telemetry link optik GPON OLT regional dan packet drop detection.",
        isPrimary: true,
      },
    ],
  },
  pertamina: {
    mypertamina: [
      {
        id: "pert-mypert-apm",
        title: "APM MyPertamina QR Subsidi Tepat Scanner",
        url: "https://apm.pertamina.com/d/mypertamina/qr-subsidi",
        category: "APM",
        description: "Monitoring latensi pemindaian barcode subsidi tepat di SPBU.",
        isPrimary: true,
      },
    ],
    "fuel scada": [
      {
        id: "pert-scada-telemetry",
        title: "SCADA Fuel Storage Terminal Telemetry",
        url: "https://scada.pertamina.com/d/fuel-scada/tank-telemetry",
        category: "Portal",
        description: "Sensor level tangki bahan bakar minyak dan kalibrasi telemetry.",
        isPrimary: true,
      },
    ],
  },
};
