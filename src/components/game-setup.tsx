"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAnonymizedPhrases } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Play, Loader2, User, Trash2, Users } from "lucide-react";
import type { Player, Phrase } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phrases: z
    .array(
      z.object({
        value: z
          .string()
          .min(10, { message: "Phrase must be at least 10 characters." }),
      })
    )
    .min(1, "At least one phrase is required.")
    .max(3, "You can add up to 3 phrases."),
});

interface GameSetupProps {
  players: Player[];
  onPlayerAdd: (player: Player, phrases: Phrase[]) => void;
  onStartGame: () => void;
}

export function GameSetup({
  players,
  onPlayerAdd,
  onStartGame,
}: GameSetupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phrases: [{ value: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "phrases",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const originalPhrases = values.phrases.map((p) => p.value);
      const anonymizedPhrases = await getAnonymizedPhrases(originalPhrases);

      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name: values.name,
      };

      const newPhrases: Phrase[] = anonymizedPhrases.map((text) => ({
        id: crypto.randomUUID(),
        anonymizedText: text,
        authorId: newPlayer.id,
      }));

      onPlayerAdd(newPlayer, newPhrases);
      toast({
        title: "Player Added!",
        description: `${values.name} and their mystery phrases are in the game.`,
      });
      form.reset();
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: "Could not anonymize phrases. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="w-full">
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <Users className="h-5 w-5" /> Players ({players.length})
        </h3>
        {players.length > 0 ? (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {players.map((player) => (
              <li
                key={player.id}
                className="bg-primary/10 p-3 rounded-lg flex items-center gap-3"
              >
                <User className="h-5 w-5 text-primary" />
                <span className="font-medium text-primary">{player.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4 bg-muted rounded-lg">
            No players have joined yet. Be the first!
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="lg" variant="secondary">
              <UserPlus className="mr-2" /> Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add a New Player</DialogTitle>
              <DialogDescription>
                Enter your name and up to 3 phrases about yourself. The AI will
                anonymize them!
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Alex" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Your Secret Phrases</FormLabel>
                  <div className="space-y-2 mt-2">
                  {fields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`phrases.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Textarea
                                placeholder={`Something mysterious... (${index + 1})`}
                                {...field}
                              />
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  </div>
                  {fields.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ value: "" })}
                      className="mt-2"
                    >
                      Add another phrase
                    </Button>
                  )}
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Add me to the game
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Button
          size="lg"
          onClick={onStartGame}
          disabled={players.length < 2}
          variant="default"
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <Play className="mr-2" /> Start Game
        </Button>
      </div>
      {players.length < 2 && (
        <p className="text-sm text-muted-foreground">
          You need at least 2 players to start the game.
        </p>
      )}
    </div>
  );
}
