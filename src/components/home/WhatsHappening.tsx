'use client';

/**
 * @file WhatsHappening.tsx
 * @description "What's happening on SoB" — trending topics + top public posts,
 * fed by the real public homepage aggregate.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, MessageCircle, MessagesSquare } from 'lucide-react';
import type { HomepagePost, HomepageTopicStat } from '../../types/homepage';
import FeaturedPostRow from './FeaturedPostRow';
import SectionHeading from './SectionHeading';
import SectionMessage from './SectionMessage';
import { Skeleton } from '../ui/Skeleton';

interface WhatsHappeningProps {
  topics: HomepageTopicStat[];
  posts: HomepagePost[];
  isLoading: boolean;
  hasError: boolean;
}

export default function WhatsHappening({ topics, posts, isLoading, hasError }: WhatsHappeningProps) {
  return (
    <section aria-labelledby="whats-happening-heading" className="py-6 md:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="What's happening"
          title="What's happening on SoB"
          description="Real conversations from real people on SoB."
          id="whats-happening-heading"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Trending topics
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : hasError ? (
              <SectionMessage message="Live topics are temporarily unavailable." />
            ) : topics.length === 0 ? (
              <SectionMessage message="Topics will appear here as conversations grow." />
            ) : (
              <ul className="space-y-3">
                {topics.map((topic) => (
                  <li key={topic.slug}>
                    <div className="rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-accent/40 hover:bg-card">
                      <Link
                        href="/search"
                        aria-label={`Explore the ${topic.name} topic on SoB`}
                        className="group flex items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                            <MessagesSquare className="h-4 w-4 text-accent" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{topic.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {topic.discussions} {topic.discussions === 1 ? 'discussion' : 'discussions'}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
                      </Link>

                      {topic.topPost && (
                        <Link
                          href={`/post/${topic.topPost.id}`}
                          aria-label={`Read the top post in ${topic.name} — ${topic.topPost.title || topic.topPost.bodyPreview.slice(0, 60)}`}
                          className="group mt-3 block rounded-lg bg-muted/40 p-3 transition-colors hover:bg-accent/5"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                            Top post
                          </p>
                          {topic.topPost.title ? (
                            <h4 className="mt-1 text-sm font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-accent">
                              {topic.topPost.title}
                            </h4>
                          ) : (
                            <p className="mt-1 break-words text-sm text-foreground/90 line-clamp-3">
                              {topic.topPost.bodyPreview}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            {topic.topPost.author && (
                              <span className="max-w-[7rem] truncate font-medium text-foreground/80">
                                @{topic.topPost.author.username}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Heart className="h-3.5 w-3.5" />
                              {topic.topPost.likes}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {topic.topPost.comments}
                            </span>
                          </div>
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-3">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Top posts
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : hasError ? (
              <SectionMessage message="Live posts are temporarily unavailable." />
            ) : posts.length === 0 ? (
              <SectionMessage message="No public posts yet — be the first to share an idea on SoB." />
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <FeaturedPostRow key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
