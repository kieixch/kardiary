"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useAppearance } from "@/components/app/appearance-provider";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder: string;
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className="toolbar-btn"
      data-active={Boolean(active)}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px self-center bg-[var(--border)]" />;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const { t } = useAppearance();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose-diary focus:outline-none",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) {
        return {
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          h1: false,
          h2: false,
          bullet: false,
          ordered: false,
          quote: false,
          code: false,
          link: false,
          canUndo: false,
          canRedo: false,
        };
      }
      return {
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        h1: current.isActive("heading", { level: 1 }),
        h2: current.isActive("heading", { level: 2 }),
        bullet: current.isActive("bulletList"),
        ordered: current.isActive("orderedList"),
        quote: current.isActive("blockquote"),
        code: current.isActive("codeBlock"),
        link: current.isActive("link"),
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
      };
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="editor-shell skeleton h-[380px]" />;
  }

  function setLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const url = window.prompt(t("linkPrompt"), "https://");
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div className="editor-shell">
      <div className="editor-toolbar" role="toolbar" aria-label={t("editEntry")}>
        <ToolbarButton
          label={t("formatBold")}
          active={state?.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("formatItalic")}
          active={state?.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("formatUnderline")}
          active={state?.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("formatStrike")}
          active={state?.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={15} />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          label={t("formatHeading1")}
          active={state?.h1}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("formatHeading2")}
          active={state?.h2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          label={t("formatList")}
          active={state?.bullet}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("formatOrderedList")}
          active={state?.ordered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("formatQuote")}
          active={state?.quote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("formatCode")}
          active={state?.code}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("formatLink")}
          active={state?.link}
          onClick={setLink}
        >
          <Link2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("formatDivider")}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={15} />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          label={t("formatUndo")}
          disabled={!state?.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label={t("formatRedo")}
          disabled={!state?.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={15} />
        </ToolbarButton>
      </div>
      <div className={cn("editor-content")}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
