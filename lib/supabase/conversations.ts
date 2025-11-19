import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type Conversation = Database['public']['Tables']['conversations']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export type { Conversation, Message };

/**
 * Create a new conversation
 */
export async function createConversation(data: {
  title?: string;
  agentType?: 'cooking' | 'fitness' | 'general';
}): Promise<{ data: Conversation | null; error: any }> {
  const supabase = createClient();

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, error: userError || new Error('Not authenticated') };
  }

  const conversationData: ConversationInsert = {
    user_id: user.id,
    title: data.title || null,
    agent_type: data.agentType || 'cooking',
  };

  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert(conversationData)
    .select()
    .single();

  return { data: conversation, error };
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(params?: {
  agentType?: string;
  limit?: number;
}): Promise<{ data: Conversation[] | null; error: any }> {
  const supabase = createClient();

  let query = supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (params?.agentType) {
    query = query.eq('agent_type', params.agentType);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  return { data, error };
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(conversationId: string): Promise<{
  data: Conversation | null;
  error: any;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  return { data, error };
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<{ data: Conversation | null; error: any }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)
    .select()
    .single();

  return { data, error };
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId: string): Promise<{
  error: any;
}> {
  const supabase = createClient();

  // Messages will be deleted automatically via CASCADE
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  return { error };
}

/**
 * Save a message to a conversation
 */
export async function saveMessage(data: {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any;
  sources?: any;
  attachments?: any;
}): Promise<{ data: Message | null; error: any }> {
  const supabase = createClient();

  const messageData: MessageInsert = {
    conversation_id: data.conversationId,
    role: data.role,
    content: data.content,
    tool_calls: data.toolCalls || null,
    sources: data.sources || null,
    attachments: data.attachments || null,
  };

  const { data: message, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single();

  // Update conversation's updated_at timestamp
  if (!error) {
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', data.conversationId);
  }

  return { data: message, error };
}

/**
 * Get all messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<{
  data: Message[] | null;
  error: any;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return { data, error };
}

/**
 * Generate a conversation title from the first user message
 */
export function generateConversationTitle(firstMessage: string): string {
  const maxLength = 50;
  const trimmed = firstMessage.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // Truncate at word boundary
  const truncated = trimmed.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Search conversations by title
 */
export async function searchConversations(searchTerm: string): Promise<{
  data: Conversation[] | null;
  error: any;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .ilike('title', `%${searchTerm}%`)
    .order('updated_at', { ascending: false });

  return { data, error };
}
