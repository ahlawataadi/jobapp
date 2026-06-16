import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useListConversationsQuery,
  useGetConversationQuery,
  useSendMessageMutation,
} from "../store/jobsApi.js";

function ConversationSidebar({ conversations, activeId }) {
  return (
    <div className="w-full md:w-64 border-r border-gray-200 bg-white overflow-y-auto shrink-0">
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Messages</h2>
      </div>
      {conversations.length === 0 && (
        <p className="text-sm text-gray-400 p-4">No conversations yet.</p>
      )}
      {conversations.map((c) => {
        const other = c.other;
        const initials = (other?.name || "?")[0].toUpperCase();
        return (
          <Link
            key={c._id}
            to={`/chat/${other?._id}`}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${activeId === String(other?._id) ? "bg-primary-50" : ""}`}
          >
            {other?.avatarUrl ? (
              <img src={other.avatarUrl} alt={other.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0 text-sm">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{other?.name}</p>
              <p className="text-xs text-gray-500 truncate">{c.content}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function MessageThread({ userId }) {
  const { user } = useSelector((s) => s.auth);
  const { data, refetch } = useGetConversationQuery({ userId }, { pollingInterval: 5000 });
  const [send, { isLoading: sending }] = useSendMessageMutation();
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await send({ userId, content: text });
    setText("");
    refetch();
  };

  const messages = data?.messages || [];
  const other = data?.other;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        {other?.avatarUrl ? (
          <img src={other.avatarUrl} alt={other.name} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm">
            {(other?.name || "?")[0].toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">{other?.name}</p>
          <p className="text-xs text-gray-500 capitalize">{other?.role}</p>
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-2 text-xs text-yellow-700">
        Contact details (phone numbers, emails) are automatically removed from messages.
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => {
          const mine = String(m.fromId) === String(user?.id || user?._id);
          return (
            <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                  mine
                    ? "bg-primary-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                <p>{m.content}</p>
                <p className={`text-xs mt-1 ${mine ? "text-primary-200" : "text-gray-400"}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          disabled={sending || !text.trim()}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function ChatPage() {
  const { userId } = useParams();
  const { user } = useSelector((s) => s.auth);
  const { data: convsData } = useListConversationsQuery(undefined, { pollingInterval: 10000 });
  const conversations = convsData?.conversations || [];

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Log in to use messaging.</p>
        <Link to="/login" className="text-primary-600 font-semibold mt-2 block">Log in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-0 md:px-4 py-0 md:py-6">
      <div className="bg-white border border-gray-200 rounded-none md:rounded-xl shadow-card overflow-hidden flex" style={{ height: "calc(100vh - 6rem)" }}>
        <ConversationSidebar conversations={conversations} activeId={userId} />
        {userId ? (
          <MessageThread userId={userId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a conversation or start a new one from a worker's profile.
          </div>
        )}
      </div>
    </div>
  );
}
