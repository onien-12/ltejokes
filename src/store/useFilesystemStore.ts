import { create } from "zustand";

export type FileItem = {
  name: string;
  type: "file" | "folder";
  contents?: FileItem[];
};

type FilesystemStore = {
  filesystem: FileItem[];
};

export const useFilesystemStore = create<FilesystemStore>((set) => ({
  filesystem: [
    {
      name: "Documents",
      type: "folder",
      contents: [
        { name: "Resume.pdf", type: "file" },
        { name: "Notes.txt", type: "file" },
      ],
    },
    {
      name: "Pictures",
      type: "folder",
      contents: [
        { name: "vacation.png", type: "file" },
        { name: "screenshot.png", type: "file" },
      ],
    },
    {
      name: "Readme.md",
      type: "file",
    },
  ],
}));
