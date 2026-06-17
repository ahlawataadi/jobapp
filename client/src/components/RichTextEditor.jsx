import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { useEffect, useCallback, useRef } from "react";

const ToolBtn = ({ active, onClick, title, children, disabled }) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={`px-2 py-1 rounded text-sm font-medium border transition-colors select-none ${
      active
        ? "bg-primary-600 text-white border-primary-600"
        : "bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:text-primary-700 disabled:opacity-40"
    }`}
  >
    {children}
  </button>
);

const Divider = () => <span className="w-px h-5 bg-gray-300 mx-0.5 self-center" />;

export default function RichTextEditor({ value, onChange, minHeight = 200, uploadImageFn }) {
  const imgInputRef = useRef(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: value || "",
    onUpdate({ editor: e }) {
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "", false);
    }
  }, [value]);

  const insertImageUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const handleImageFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    if (uploadImageFn) {
      const url = await uploadImageFn(file);
      if (url) editor.chain().focus().setImage({ src: url }).run();
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => editor.chain().focus().setImage({ src: ev.target.result }).run();
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }, [editor, uploadImageFn]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-400 focus-within:border-primary-400">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        {/* History */}
        <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>↩</ToolBtn>
        <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>↪</ToolBtn>
        <Divider />

        {/* Text style */}
        <ToolBtn active={editor.isActive("bold")} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolBtn>
        <ToolBtn active={editor.isActive("italic")} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></ToolBtn>
        <ToolBtn active={editor.isActive("underline")} title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolBtn>
        <ToolBtn active={editor.isActive("strike")} title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolBtn>
        <ToolBtn active={editor.isActive("code")} title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()}>{"<>"}</ToolBtn>
        <Divider />

        {/* Headings */}
        <ToolBtn active={editor.isActive("heading", { level: 1 })} title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 2 })} title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 3 })} title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolBtn>
        <ToolBtn active={editor.isActive("paragraph")} title="Paragraph" onClick={() => editor.chain().focus().setParagraph().run()}>¶</ToolBtn>
        <Divider />

        {/* Lists */}
        <ToolBtn active={editor.isActive("bulletList")} title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolBtn>
        <Divider />

        {/* Alignment */}
        <ToolBtn active={editor.isActive({ textAlign: "left" })} title="Align left" onClick={() => editor.chain().focus().setTextAlign("left").run()}>⬅</ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "center" })} title="Align center" onClick={() => editor.chain().focus().setTextAlign("center").run()}>↔</ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "right" })} title="Align right" onClick={() => editor.chain().focus().setTextAlign("right").run()}>➡</ToolBtn>
        <Divider />

        {/* Blocks */}
        <ToolBtn active={editor.isActive("blockquote")} title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()}>"</ToolBtn>
        <ToolBtn active={editor.isActive("codeBlock")} title="Code block" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{ "{}" }</ToolBtn>
        <ToolBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</ToolBtn>
        <Divider />

        {/* Link */}
        <ToolBtn active={editor.isActive("link")} title="Insert / edit link" onClick={setLink}>🔗</ToolBtn>
        {editor.isActive("link") && (
          <ToolBtn title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>✂</ToolBtn>
        )}
        <Divider />

        {/* Image */}
        <ToolBtn title="Insert image by URL" onClick={insertImageUrl}>🖼</ToolBtn>
        <label
          title="Upload image from file"
          onMouseDown={(e) => e.preventDefault()}
          className="px-2 py-1 rounded text-sm font-medium border transition-colors bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:text-primary-700 cursor-pointer select-none"
        >
          📷
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
        </label>
        <Divider />

        {/* Clear */}
        <ToolBtn title="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>✕</ToolBtn>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className={`
          prose prose-sm max-w-none p-4 text-gray-900
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-4 [&_.ProseMirror_h1]:mb-2
          [&_.ProseMirror_h2]:text-xl  [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-3 [&_.ProseMirror_h2]:mb-2
          [&_.ProseMirror_h3]:text-lg  [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1
          [&_.ProseMirror_p]:my-2
          [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-2
          [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-2
          [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-gray-500 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:my-3
          [&_.ProseMirror_code]:bg-gray-100 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-sm [&_.ProseMirror_code]:font-mono
          [&_.ProseMirror_pre]:bg-gray-900 [&_.ProseMirror_pre]:text-gray-100 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:my-3 [&_.ProseMirror_pre]:overflow-x-auto
          [&_.ProseMirror_a]:text-primary-600 [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:cursor-pointer
          [&_.ProseMirror_hr]:border-gray-300 [&_.ProseMirror_hr]:my-4
          [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-3 [&_.ProseMirror_img]:cursor-pointer
          [&_.ProseMirror_img.ProseMirror-selectednode]:ring-2 [&_.ProseMirror_img.ProseMirror-selectednode]:ring-primary-400
          [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none
        `}
      />
    </div>
  );
}
