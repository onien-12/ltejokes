import React, { useState, useMemo } from "react";
import { useSystemStore } from "../../store/useSystemStore";
import { handleOpen } from "./FileManager";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import Input from "../utils/Input"; // Assuming you have this from GlossaryWindow
import Button from "../utils/Button";

interface ProjectDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}

export default function ProjectsWindow() {
  const { addCustomWindow } = useSystemStore();
  const [searchTerm, setSearchTerm] = useState("");

  const projects: ProjectDef[] = useMemo(
    () => [
      {
        id: "telco",
        title: "LTE/5gNR textbook",
        description: "An LTE/5gNR base station study.",
        icon: "material-symbols:cell-tower",
        path: "/projects/telco/project.md",
      },
      {
        id: "automatization",
        title: "The shooting gallery",
        description: "An automatization system for a network of shooting ranges based in USA.",
        icon: "solar:play-stream-bold",
        path: "/projects/tsg/project.md",
      },
    ],
    [],
  );

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    const lower = searchTerm.toLowerCase();
    return projects.filter((p) => p.title.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower));
  }, [searchTerm, projects]);

  const openProject = (project: ProjectDef) => {
    handleOpen({
      addCustomWindow,
      file: {
        name: project.path.split("/").at(-1) as string,
        type: "file",
      },
      fullPath: project.path,
    });
  };

  return (
    <div className="bg-[#111111]/80 flex flex-col w-full h-full text-white font-sans overflow-hidden">
      <div className="p-3 border-b border-[#444]">
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={setSearchTerm}
          type="search"
          className="bg-[#111111]/70"
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-[#111]">
        <div className="flex flex-col items-center justify-center py-3 text-red-500">
          <span className="text-sm">This window is not finished yet!</span>
        </div>
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Icon icon="material-symbols:search-off" width="32" className="mb-2 opacity-50" />
            <span className="text-sm">No projects found</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className={clsx(
                  "group flex items-center justify-between p-4",
                  "border border-transparent border-b-[#333]",
                  "hover:border-blue-500/50 transition-colors duration-150",
                )}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center 
                                  rounded bg-[#222] border border-[#333] 
                                  text-gray-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors"
                  >
                    <Icon icon={project.icon} width="20" height="20" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-semibold text-gray-200 group-hover:text-white truncate">{project.title}</h3>
                      <span className="text-[10px] text-gray-600 font-mono hidden sm:inline-block">
                        {project.id.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate group-hover:text-gray-400">{project.description}</p>
                  </div>
                </div>

                <div className="pl-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button
                    onClick={() => openProject(project)}
                    className="!py-1 !px-3 !text-xs bg-[#2a2a2a] hover:bg-blue-600 border border-[#333]"
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
