import { NextResponse } from "next/server";
import { getPrismaClient } from "@/backend/infrastructure/database/prismaClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      service: "QualiSaúde Hospitalar",
      database: "connected",
      checkedAt: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "QualiSaúde Hospitalar",
        database: "unavailable",
        message: "Banco de dados indisponível. Verifique DATABASE_URL, SSL e status do Supabase."
      },
      { status: 503 }
    );
  }
}
