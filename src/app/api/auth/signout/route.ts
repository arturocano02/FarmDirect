import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  
  await supabase.auth.signOut();
  
  return NextResponse.redirect(`${origin}/login?message=You have been signed out`);
}

export async function POST() {
  const supabase = await createClient();
  
  await supabase.auth.signOut();
  
  return NextResponse.json({ success: true });
}
