"use client";

import { useEffect } from "react";
import { paths } from "@/app/lib/routes";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error secara internal tanpa mengekspos detail stack trace ke UI publik
    console.error("[Central Tracking Dashboard] Global root error caught:", error);
  }, [error]);

  return (
    <html lang="id" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Terjadi kesalahan — Central Tracking Dashboard</title>
        <link rel="icon" type="image/png" href="/hutabyte_icon_transparent.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/hutabyte_icon_transparent.png" type="image/png" />
        <link rel="apple-touch-icon" href="/hutabyte_icon_transparent.png" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "calc(100% - 32px)",
            padding: "32px",
            backgroundColor: "#1e293b",
            borderRadius: "16px",
            border: "1px solid #334155",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Logo tampil langsung tanpa tile */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hutabyte_icon_transparent.png"
            alt="Central Tracking Dashboard"
            width={56}
            height={69}
            style={{
              width: "56px",
              height: "auto",
              objectFit: "contain",
              display: "block",
              marginBottom: "20px",
              filter: "drop-shadow(0 4px 14px rgba(2, 6, 23, 0.55))",
            }}
          />

          <h1
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#f8fafc",
              margin: "0 0 8px 0",
            }}
          >
            Terjadi kesalahan
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#94a3b8",
              lineHeight: 1.5,
              margin: "0 0 20px 0",
            }}
          >
            Aplikasi mengalami kendala teknis tak terduga. Silakan coba lagi atau muat ulang halaman.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#64748b",
                margin: "0 0 20px 0",
              }}
            >
              Kode: {error.digest}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                flex: "1 1 120px",
                minHeight: "40px",
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: "#0284c7",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Coba lagi
            </button>

            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href={paths.dashboard}
              style={{
                flex: "1 1 120px",
                minHeight: "40px",
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: "#0f172a",
                color: "#cbd5e1",
                border: "1px solid #334155",
                fontWeight: 600,
                fontSize: "13px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              Muat ulang
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
