"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  getConversations,
  deleteConversation,
  type Conversation
} from "@/lib/supabase/conversations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Trash2, Search } from "lucide-react";

interface ConversationListProps {
  onSelectConversation: (conversationId: string) => void;
  currentConversationId?: string | null;
  onNewConversation?: () => void;
  refreshTrigger?: number; // Increment to trigger refresh
}

export default function ConversationList({
  onSelectConversation,
  currentConversationId,
  onNewConversation,
  refreshTrigger
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Load conversations on mount and when refreshTrigger changes
  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]);

  // Filter conversations when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchTerm, conversations]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const { data, error } = await getConversations();
      if (!error && data) {
        setConversations(data);
        setFilteredConversations(data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!conversationToDelete) return;

    try {
      const { error } = await deleteConversation(conversationToDelete);
      if (!error) {
        // Remove from local state
        setConversations(prev => prev.filter(c => c.id !== conversationToDelete));

        // If deleted conversation was active, trigger new conversation
        if (conversationToDelete === currentConversationId && onNewConversation) {
          onNewConversation();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const getAgentIcon = (agentType: string | null) => {
    // Map agent types to emoji or icons
    switch (agentType) {
      case 'cooking':
        return '🍳';
      case 'fitness':
        return '💪';
      default:
        return '💬';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chat History</h2>
          {onNewConversation && (
            <Button size="sm" onClick={onNewConversation}>
              New Chat
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchTerm ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`
                  relative cursor-pointer transition-colors hover:bg-accent
                  ${conv.id === currentConversationId ? 'bg-accent' : ''}
                `}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="flex items-center pr-12 pl-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getAgentIcon(conv.agent_type)}</span>
                      <h3 className="font-medium truncate">
                        {conv.title || 'Untitled Conversation'}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {conv.updated_at && formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-8 top-1/2 -translate-y-1/2 h-8 w-8 z-10"
                  onClick={(e) => handleDeleteClick(conv.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
