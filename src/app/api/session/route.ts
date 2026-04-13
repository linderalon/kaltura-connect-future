import { NextResponse } from "next/server";

// GET /api/session — return active sessions or create a new one
export async function GET() {
  return NextResponse.json(
    { message: "GET /api/session — placeholder", sessions: [] },
    { status: 200 }
  );
}

// POST /api/session — create a new visitor session
export async function POST() {
  return NextResponse.json(
    { message: "POST /api/session — placeholder", sessionId: null },
    { status: 201 }
  );
}
