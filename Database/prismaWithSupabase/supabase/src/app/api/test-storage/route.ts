import { uploadFile } from "@/src/storage/service";

export async function POST() {
    const file = new File(
        ["Hello from Supabase Storage"],
        "test.txt",
        { type: "text/plain" }
    );

    const result = await uploadFile(
        `test/test-${Date.now()}.txt`,
        file
    );

    return Response.json(result);
}