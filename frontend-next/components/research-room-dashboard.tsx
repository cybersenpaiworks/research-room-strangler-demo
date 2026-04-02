"use client";

import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { DEFAULT_SESSION_ID, getGatewayBaseUrl, getSocketPath } from '@/lib/config';

type LegacySessionPayload = {
  source: string;
  controller: string;
  synchronous: boolean;
  elapsedMs: number;
  snapshot_updated_at: string | null;
  data: {
    id: number;
    title: string;
    moderator_name: string;
    participant_name: string;
    status: string;
    scheduled_at: string;
    legacy_notes: string;
  };
};

type GatewaySessionPayload = LegacySessionPayload;

type DemoEvent = {
  id: number;
  sessionId: number;
  author: string;
  message: string;
  createdAt: string;
};

const upsertDemoEvent = (current: DemoEvent[], nextEvent: DemoEvent): DemoEvent[] => {
  const withoutExisting = current.filter((item) => item.id !== nextEvent.id);
  return [nextEvent, ...withoutExisting].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

const formatClock = (value: string | null): string => {
  if (!value) {
    return 'Waiting...';
  }

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export function ResearchRoomDashboard() {
  const sessionId = DEFAULT_SESSION_ID;
  const [legacySession, setLegacySession] = useState<LegacySessionPayload | null>(null);
  const [lastLegacyCheckAt, setLastLegacyCheckAt] = useState<string | null>(null);
  const [gatewaySession, setGatewaySession] = useState<GatewaySessionPayload | null>(null);
  const [gatewayUpstream, setGatewayUpstream] = useState<string>('waiting');
  const [lastGatewayCheckAt, setLastGatewayCheckAt] = useState<string | null>(null);
  const [demoEvents, setDemoEvents] = useState<DemoEvent[]>([]);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'live' | 'disconnected'>('connecting');
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const buildUrl = useCallback((path: string) => `${getGatewayBaseUrl()}${path}`, []);

  const loadLegacySession = useCallback(async () => {
    try {
      const response = await fetch(buildUrl(`/yii-legacy/session/${sessionId}`), {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Unable to load the legacy snapshot.');
      }

      const payload = (await response.json()) as LegacySessionPayload;
      setLegacySession(payload);
    } finally {
      setLastLegacyCheckAt(new Date().toISOString());
    }
  }, [buildUrl, sessionId]);

  const loadDemoEvents = useCallback(async () => {
    const response = await fetch(buildUrl(`/node-api/sessions/${sessionId}/demo-events`), {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Unable to load the live demo events.');
    }

    const payload = (await response.json()) as DemoEvent[];
    setDemoEvents(payload);
  }, [buildUrl, sessionId]);

  const loadGatewaySession = useCallback(async () => {
    try {
      const response = await fetch(buildUrl(`/interview/session/${sessionId}`), {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Unable to load the canonical gateway route.');
      }

      const payload = (await response.json()) as GatewaySessionPayload;
      setGatewaySession(payload);
      setGatewayUpstream(response.headers.get('X-Upstream-Service') ?? payload.source);
    } finally {
      setLastGatewayCheckAt(new Date().toISOString());
    }
  }, [buildUrl, sessionId]);

  useEffect(() => {
    const pollLegacySnapshot = () => {
      void loadLegacySession().catch((error: Error) => {
        setErrorMessage(error.message);
      });
    };

    pollLegacySnapshot();

    const intervalId = window.setInterval(pollLegacySnapshot, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadLegacySession]);

  useEffect(() => {
    void loadDemoEvents().catch((error: Error) => {
      setErrorMessage(error.message);
    });
  }, [loadDemoEvents]);

  useEffect(() => {
    const pollGatewaySession = () => {
      void loadGatewaySession().catch((error: Error) => {
        setErrorMessage(error.message);
      });
    };

    pollGatewaySession();

    const intervalId = window.setInterval(pollGatewaySession, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadGatewaySession]);

  useEffect(() => {
    const socket = io(getGatewayBaseUrl() || undefined, {
      path: getSocketPath(),
      transports: ['websocket', 'polling'],
      query: {
        sessionId,
      },
    });

    socket.on('connect', () => {
      setSocketStatus('live');
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      setSocketStatus('disconnected');
      setErrorMessage(error.message);
    });

    socket.on('demo:event', (event: DemoEvent) => {
      setDemoEvents((current) => upsertDemoEvent(current, event));
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const simulateEvent = async () => {
    try {
      setIsSimulating(true);
      setErrorMessage(null);

      const response = await fetch(buildUrl(`/node-api/sessions/${sessionId}/demo-events`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Unable to simulate the interview event.');
      }

      const payload = (await response.json()) as DemoEvent;
      setDemoEvents((current) => upsertDemoEvent(current, payload));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unexpected simulation error.');
    } finally {
      setIsSimulating(false);
    }
  };

  const latestModernEvent = demoEvents[0] ?? null;
  const legacyMoment =
    demoEvents.length === 0
      ? 'No synced moment yet. Trigger the simulation to start the comparison.'
      : legacySession?.data.legacy_notes?.trim() || 'Waiting for the next legacy poll to surface the newest moment.';
  const modernMoment = latestModernEvent?.message ?? 'No live events yet. Trigger the simulation to push the first interview moment.';
  const legacyBehind = Boolean(latestModernEvent && legacySession && legacySession.data.legacy_notes !== latestModernEvent.message);
  const sessionTitle = legacySession?.data.title ?? 'Interview session';
  const participantName = legacySession?.data.participant_name ?? 'Participant';
  const moderatorName = legacySession?.data.moderator_name ?? 'Moderator';
  const legacyNarrative = !latestModernEvent
    ? 'Trigger one event and this card will immediately demonstrate the wait: nothing changes here until the next poll fully completes.'
    : legacyBehind
      ? 'This is the cascade effect: the event already exists on the modern side, but the user is still waiting for synchronous PHP plus the next polling cycle.'
      : 'Legacy finally caught up, but only after one full polling round. The business event was already available before the UI reflected it.';
  const gatewayMoment = gatewaySession?.data.legacy_notes ?? 'Waiting for the canonical gateway route to answer.';
  const gatewayMode = gatewaySession?.synchronous ? 'Legacy sync path' : gatewaySession ? 'Modern direct path' : 'Waiting';
  const gatewayNarrative =
    gatewayUpstream === 'modern-node'
      ? 'The public route is already on the modern read model. The legacy panel still lags for compatibility, but the stable URL is now serving the faster path.'
      : gatewayUpstream === 'legacy-yii'
        ? 'The public route is still bound to the legacy sync path. New moments must wait for the legacy controller and polling cycle before the stable route looks fresh.'
        : 'Waiting for the gateway route to answer so the current upstream can be identified.';

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(2,6,23,0.94))] p-8 shadow-2xl shadow-slate-950/30">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="kicker">Strangler Fig Demo</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Same event. Legacy waits. Modern responds now.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Trigger one interview moment and watch the difference in user experience: the modern stream confirms it
              immediately, while the legacy snapshot stalls behind polling, PHP latency, and a visibly stale screen.
            </p>
          </div>

          <button
            type="button"
            onClick={simulateEvent}
            disabled={isSimulating}
            className="rounded-2xl bg-cyan-400 px-6 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSimulating ? 'Injecting Event...' : 'Simulate Interview Event'}
          </button>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <ContextStat label="Session" value={sessionTitle} />
          <ContextStat label="Moderator" value={moderatorName} />
          <ContextStat label="Participant" value={participantName} />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <NarrativeChip title="Trigger" body="One button generates one business event from the modern API." />
          <NarrativeChip title="Fast path" body="The interviewer sees the new moment immediately through the WebSocket stream." />
          <NarrativeChip title="Slow path" body="The legacy view stays stale until the next 3s poll finishes and PHP returns." />
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="kicker">Live Nginx Cutover</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Same URL. Live cutover through nginx.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Keep this page open and switch the gateway in another terminal. The client contract stays fixed while nginx
              changes which implementation serves the route behind it.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Canonical route</p>
            <p className="mt-2 font-mono text-sm text-white">/interview/session/{sessionId}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <ComparisonStat label="Current upstream" value={gatewayUpstream} tone={gatewayUpstream === 'modern-node' ? 'modern' : 'legacy'} />
          <ComparisonStat label="Gateway check" value={formatClock(lastGatewayCheckAt)} tone="modern" />
          <ComparisonStat label="Route mode" value={gatewayMode} tone={gatewayUpstream === 'modern-node' ? 'modern' : 'legacy'} />
          <ComparisonStat label="Gateway latency" value={gatewaySession ? `${gatewaySession.elapsedMs} ms` : 'Waiting...'} tone={gatewayUpstream === 'modern-node' ? 'modern' : 'legacy'} />
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">What the stable route is serving right now</p>
          <p className="mt-4 text-xl font-semibold leading-8 text-white">{gatewayMoment}</p>
        </div>

        <p className="mt-4 text-sm text-slate-400">{gatewayNarrative}</p>

        <p className="mt-4 text-sm text-slate-400">
          Demo command:
          <code className="ml-2 rounded-md bg-slate-950 px-2 py-1 font-mono text-slate-200">./scripts/cutover-session-route.sh modern</code>
          <code className="ml-2 rounded-md bg-slate-950 px-2 py-1 font-mono text-slate-200">./scripts/cutover-session-route.sh legacy</code>
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[2rem] border border-amber-400/20 bg-amber-500/[0.08] p-6 shadow-lg shadow-slate-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Legacy Snapshot</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Wait For Polling To Finish</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                This is the slow path. Even after the new moment exists elsewhere, this card cannot move until a synchronous
                HTTP poll finishes and the legacy controller returns.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-400/25 bg-slate-950/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-200" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Polling every 3s...</p>
                  <p className="mt-1 text-xs text-slate-400">Last check: {formatClock(lastLegacyCheckAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ComparisonStat label="State" value={legacyBehind ? 'Stale until next poll' : latestModernEvent ? 'Finally caught up' : 'Waiting for first event'} tone="legacy" />
            <ComparisonStat label="Response time" value={legacySession ? `${legacySession.elapsedMs} ms` : 'Loading...'} tone="legacy" />
            <ComparisonStat label="Snapshot as of" value={formatClock(legacySession?.snapshot_updated_at ?? null)} tone="legacy" />
            <ComparisonStat label="Delivery mode" value="HTTP poll + sync PHP controller" tone="legacy" />
          </div>

          <div className="mt-6 rounded-3xl border border-amber-400/20 bg-slate-950/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Last visible interview moment</p>
            <p className="mt-4 text-xl font-semibold leading-8 text-white">{legacyMoment}</p>
          </div>

          <p className="mt-4 text-sm text-slate-400">{legacyNarrative}</p>
        </article>

        <article className="rounded-[2rem] border border-cyan-400/20 bg-cyan-500/[0.08] p-6 shadow-lg shadow-slate-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Modern Stream</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Publish Once, Update Immediately</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                This is the fast path. The same interview moment lands here as soon as the modern API publishes it, without
                waiting for another page poll to confirm progress.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/25 bg-slate-950/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-3 w-3 rounded-full ${socketStatus === 'live' ? 'bg-emerald-300' : 'bg-rose-300'}`} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">WebSocket {socketStatus}</p>
                  <p className="mt-1 text-xs text-slate-400">Latest event: {formatClock(latestModernEvent?.createdAt ?? null)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ComparisonStat label="State" value={latestModernEvent ? 'Visible immediately' : 'Waiting for first event'} tone="modern" />
            <ComparisonStat label="Connection" value={socketStatus === 'live' ? 'Live' : 'Reconnecting'} tone="modern" />
            <ComparisonStat label="Demo events" value={String(demoEvents.length)} tone="modern" />
            <ComparisonStat label="Delivery mode" value="Socket.IO push" tone="modern" />
          </div>

          <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-slate-950/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Latest interview moment</p>
            <p className="mt-4 text-xl font-semibold leading-8 text-white">{modernMoment}</p>
          </div>

          <p className="mt-4 text-sm text-slate-400">
            This is the target state of the strangler pattern: publish the event once, update the main experience now, and let
            legacy compatibility trail behind.
          </p>
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="kicker">Recent Demo Events</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">What the interviewer can point to</h2>
          </div>
          <p className="text-sm text-slate-400">The event list proves the business action already happened, even while the legacy snapshot still looks old.</p>
        </div>

        <div className="mt-6 space-y-3">
          {demoEvents.length > 0 ? (
            demoEvents.map((event) => (
              <article key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">Modern event</p>
                    <p className="mt-2 text-base leading-7 text-white">{event.message}</p>
                  </div>
                  <p className="font-mono text-sm text-slate-400">{formatClock(event.createdAt)}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-300">
              No demo events yet. Click <span className="font-semibold text-white">Simulate Interview Event</span> to start the side-by-side comparison.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ComparisonStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'legacy' | 'modern';
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'legacy' ? 'border-amber-400/15 bg-amber-500/[0.04]' : 'border-cyan-400/15 bg-cyan-500/[0.04]'}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-sm text-slate-100">{value}</p>
    </div>
  );
}

function ContextStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-sm text-white">{value}</p>
    </div>
  );
}

function NarrativeChip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}
