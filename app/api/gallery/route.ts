export async function GET() {
  return Response.json({ items: [] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return Response.json({ saved: true, item: body });
}
