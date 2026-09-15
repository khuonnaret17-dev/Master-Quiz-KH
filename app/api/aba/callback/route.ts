import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value as string;
    });

    const apiKey = process.env.ABA_API_KEY;
    if (!apiKey) {
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    // NOTE: ABA Callback Hash Verification
    // ត្រូវយកទិន្នន័យដែលទទួលបានតាមលំដាប់ដែល ABA កំណត់ រួចធ្វើការ Hash ម្ដងទៀត
    // ហើយប្រៀបធៀបជាមួយ data.hash
    // រួចទើបធ្វើការ Update Database តាម tran_id
    
    if (data.status === '00') {
      console.log(`Payment Successful: ${data.tran_id}`);
      // TODO: Firebase update logic goes here to set user to PREMIUM
    }

    return new NextResponse('OK', { status: 200 });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
