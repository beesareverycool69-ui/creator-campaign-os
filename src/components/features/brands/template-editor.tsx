"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Mail,
  MessageCircle,
  Sparkles,
  Loader2,
  X,
  Check,
} from "lucide-react";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type OutreachTemplate,
} from "@/lib/actions/outreach-templates";
import {
  TEMPLATE_PLACEHOLDERS,
  DEFAULT_TEMPLATES,
} from "@/lib/constants/templates";

interface TemplateEditorProps {
  brandId: string;
  templates: OutreachTemplate[];
}

const CHANNEL_OPTIONS = [
  { value: "instagram_dm", label: "Instagram DM" },
  { value: "tiktok_dm", label: "TikTok DM" },
  { value: "twitter_dm", label: "Twitter DM" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
];

export function TemplateEditor({ brandId, templates }: TemplateEditorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("instagram_dm");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const resetForm = () => {
    setName("");
    setChannel("instagram_dm");
    setSubject("");
    setBody("");
    setIsCreating(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!name || !body) return;
    setIsLoading(true);
    try {
      await createTemplate(brandId, {
        name,
        channel: channel as "email" | "instagram_dm" | "tiktok_dm" | "twitter_dm" | "other",
        subject: channel === "email" ? subject : undefined,
        body,
      });
      resetForm();
    } catch (error) {
      console.error("Failed to create template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !name || !body) return;
    setIsLoading(true);
    try {
      await updateTemplate(editingId, {
        name,
        channel: channel as "email" | "instagram_dm" | "tiktok_dm" | "twitter_dm" | "other",
        subject: channel === "email" ? subject : undefined,
        body,
      });
      resetForm();
    } catch (error) {
      console.error("Failed to update template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteTemplate(id);
      setDeletingId(null);
    } catch (error) {
      console.error("Failed to delete template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (template: OutreachTemplate) => {
    setEditingId(template.id);
    setName(template.name);
    setChannel(template.channel);
    setSubject(template.subject || "");
    setBody(template.body);
    setIsCreating(false);
  };

  const handleLoadDefaults = async () => {
    setIsLoading(true);
    try {
      for (const template of Object.values(DEFAULT_TEMPLATES)) {
        await createTemplate(brandId, template);
      }
    } catch (error) {
      console.error("Failed to load defaults:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    setBody((prev) => prev + placeholder);
  };

  // Show form for create or edit
  const showForm = isCreating || editingId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Message Templates</h2>
          <p className="text-sm text-muted-foreground">
            Create reusable templates for DMs and emails
          </p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && !showForm && (
            <Button variant="outline" onClick={handleLoadDefaults} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Load Defaults
            </Button>
          )}
          {!showForm && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          )}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Template" : "Create Template"}</CardTitle>
            <CardDescription>
              {editingId ? "Update your message template" : "Create a reusable message template with placeholders"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Initial DM, Follow-up #1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Channel</Label>
                <Select
                  id="channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  {CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {channel === "email" && (
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  placeholder="Collab opportunity with {{brand_name}}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Message Body</Label>
                <span className="text-xs text-muted-foreground">
                  Click placeholders to insert
                </span>
              </div>
              <Textarea
                id="body"
                placeholder="Write your message here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* Placeholders */}
            <div className="space-y-2">
              <Label>Placeholders</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_PLACEHOLDERS.map((p) => (
                  <Button
                    key={p.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertPlaceholder(p.key)}
                    className="font-mono text-xs"
                  >
                    {p.key}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={isLoading || !name || !body}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? "Save Changes" : "Create Template"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {templates.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No templates yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first message template or load the defaults
            </p>
            <Button variant="outline" onClick={handleLoadDefaults} disabled={isLoading}>
              <Sparkles className="h-4 w-4 mr-2" />
              Load Default Templates
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      {templates.length > 0 && !showForm && (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              {deletingId === template.id ? (
                <CardContent className="py-6">
                  <p className="font-medium mb-2">Delete "{template.name}"?</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Delete"
                      )}
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {template.channel === "email" ? (
                            <Mail className="h-5 w-5 text-primary" />
                          ) : (
                            <MessageCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1 capitalize">
                            {template.channel.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigator.clipboard.writeText(template.body)}
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(template)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(template.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans bg-muted/50 rounded-lg p-3">
                      {template.body}
                    </pre>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
