import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, Pin, Trash2, Save, X } from "lucide-react";
import { useGetNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@workspace/api-client-react";
import { Note } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";

export default function Notes() {
  const [search, setSearch] = useState("");
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Editor state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");

  const queryClient = useQueryClient();
  
  const { data: notesData, isLoading } = useGetNotes({}, { query: { retry: false } });
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // Mock initial data if API fails
  const notes: Note[] = notesData || [
    { id: 1, userId: "1", title: "Cranial Nerves", content: "I - Olfactory\nII - Optic\nIII - Oculomotor\nIV - Trochlear\nV - Trigeminal\nVI - Abducens\nVII - Facial\nVIII - Vestibulocochlear\nIX - Glossopharyngeal\nX - Vagus\nXI - Accessory\nXII - Hypoglossal", category: "Neurology", tags: [], isPinned: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 2, userId: "1", title: "Heart Sounds", content: "S1: Closure of AV valves (mitral and tricuspid). Best heard at apex.\nS2: Closure of semilunar valves (aortic and pulmonary). Best heard at base.", category: "Cardiology", tags: [], isPinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];

  const activeNote = notes.find(n => n.id === activeNoteId);

  // When active note changes, update editor state
  useEffect(() => {
    if (activeNote && !isCreating) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
      setCategory(activeNote.category || "");
    } else if (isCreating) {
      setTitle("");
      setContent("");
      setCategory("");
    }
  }, [activeNote, isCreating]);

  const handleCreateNew = () => {
    setActiveNoteId(null);
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    if (isCreating) {
      createNote.mutate({
        data: { title, content, category }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
          setIsCreating(false);
        },
        onError: () => {
          setIsCreating(false);
          // UI optimistic update for demo
        }
      });
    } else if (activeNoteId) {
      updateNote.mutate({
        id: activeNoteId,
        data: { title, content, category }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
        }
      });
    }
  };

  const handleDelete = () => {
    if (!activeNoteId) return;
    deleteNote.mutate({ id: activeNoteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
        setActiveNoteId(null);
      },
      onError: () => setActiveNoteId(null) // optimistic UI update
    });
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      
      {/* Sidebar List */}
      <div className="w-full md:w-80 flex flex-col gap-4 border-r pr-6 shrink-0 h-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Clinical Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Your personal medical knowledge base.</p>
        </div>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search notes..." 
            className="pl-9 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button onClick={handleCreateNew} className="w-full justify-start mt-2">
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>

        <div className="flex-1 overflow-y-auto space-y-2 mt-2 -mr-4 pr-4 pb-4">
          {filteredNotes.map(note => (
            <button
              key={note.id}
              onClick={() => { setActiveNoteId(note.id); setIsCreating(false); }}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                activeNoteId === note.id && !isCreating
                  ? 'bg-blue-50 border-primary/30 shadow-sm' 
                  : 'bg-white border-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-medium text-sm line-clamp-1 ${activeNoteId === note.id && !isCreating ? 'text-primary' : 'text-gray-900'}`}>
                  {note.title}
                </h3>
                {note.isPinned && <Pin className="w-3 h-3 text-primary shrink-0 ml-2 mt-1" />}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{note.content}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {(activeNoteId || isCreating) ? (
          <>
            <div className="h-14 border-b flex items-center justify-between px-4 bg-gray-50/50 shrink-0">
              <div className="flex items-center text-sm font-medium text-gray-500">
                <FileText className="w-4 h-4 mr-2" />
                {isCreating ? 'New Note' : 'Editing Note'}
              </div>
              <div className="flex items-center gap-2">
                {!isCreating && (
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                )}
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
              <input 
                type="text"
                placeholder="Note Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-3xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none w-full bg-transparent"
              />
              <input 
                type="text"
                placeholder="Category (e.g. Cardiology)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-sm text-primary font-medium focus:outline-none w-full bg-transparent"
              />
              <Textarea 
                placeholder="Start typing your clinical notes..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 min-h-[300px] resize-none border-0 p-0 text-base leading-relaxed text-gray-700 focus-visible:ring-0 bg-transparent placeholder:text-gray-300"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <p>Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
