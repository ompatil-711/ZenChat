import { Loader2, Paperclip, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
interface MessageInputProps {
  selectedUser: string | null; message: string; setMessage: (value: string) => void;
  handleMessageSend: (event: FormEvent<HTMLFormElement>, image?: File | null) => Promise<boolean>;
}
export default function MessageInput({ selectedUser, message, setMessage, handleMessageSend }: MessageInputProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setUploading] = useState(false);
  const preview = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : null, [imageFile]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!message.trim() && !imageFile) || isUploading) return;
    setUploading(true);
    try { if (await handleMessageSend(event, imageFile)) setImageFile(null); }
    finally { setUploading(false); }
  }
  if (!selectedUser) return null;
  return <form onSubmit={submit} className="flex flex-col gap-2 border-t border-gray-700 pt-2">
    {preview ? <div className="relative w-fit">
      <Image src={preview} unoptimized alt="Attachment preview" width={96} height={96} className="w-24 h-24 object-cover rounded-lg" />
      <button type="button" aria-label="Remove image" onClick={() => setImageFile(null)} className="absolute -top-2 -right-2 bg-black rounded-full p-1"><X className="w-4 h-4" /></button>
    </div> : null}
    <div className="flex items-center gap-2">
      <label className="cursor-pointer bg-gray-700 rounded-lg px-3 py-2">
        <Paperclip size={18} /><span className="sr-only">Attach image</span>
        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" disabled={isUploading} onChange={event => {
          const file = event.target.files?.[0];
          if (file && file.size > 5 * 1024 * 1024) { toast.error("Images must be under 5 MiB."); return; }
          if (file) setImageFile(file);
          event.target.value = "";
        }} />
      </label>
      <input type="text" aria-label="Message" maxLength={5000} value={message} onChange={event => setMessage(event.target.value)}
        className="flex-1 min-w-0 bg-gray-700 rounded-lg px-4 py-2 text-white" placeholder={imageFile ? "Add a caption…" : "Type a message…"} />
      <button type="submit" aria-label="Send message" disabled={(!message.trim() && !imageFile) || isUploading} className="bg-blue-600 px-4 py-2 rounded-lg disabled:opacity-50">
        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  </form>;
}
