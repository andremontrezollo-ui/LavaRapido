import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, AlertTriangle } from "lucide-react";
import { useClipboard } from "@/hooks/useClipboard";
import { QRCodeSVG } from "qrcode.react";
import type { MixSession } from "@/lib/mock-session";

interface DepositInfoProps {
  session: MixSession;
  onNewOperation: () => void;
}

export function DepositInfo({ session, onNewOperation }: DepositInfoProps) {
  const { copied, copy } = useClipboard();

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="glass-card p-6 md:p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>

        <h2 className="font-heading font-semibold text-xl mb-2">
          Operation Configured
        </h2>
        <p className="text-muted-foreground mb-2">
          Send Bitcoin to the address below to start mixing
        </p>

        {/* Simulator disclaimer */}
        <div className="mb-6 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2 justify-center">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span className="text-xs text-warning">
            Educational simulator — testnet address, not valid on mainnet
          </span>
        </div>

        {/* Session Info */}
        <div className="mb-4 text-left p-4 rounded-lg bg-secondary/50 space-y-1 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Session:</span>{" "}
            <code className="font-mono text-xs">{session.sessionId}</code>
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Expires:</span>{" "}
            {session.expiresAt.toLocaleTimeString()}
          </p>
        </div>

        {/* Deposit Address */}
        <div className="p-6 rounded-xl bg-secondary border-2 border-primary/30 mb-6">
          <p className="text-sm text-muted-foreground mb-2">Deposit Address (testnet)</p>
          <div className="flex items-center gap-2 justify-center">
            <code className="font-mono text-lg md:text-xl break-all select-all">
              {session.depositAddress}
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copy(session.depositAddress)}
              className="shrink-0"
              aria-label="Copy deposit address"
            >
              {copied ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* QR Code */}
        <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center mb-6 p-3">
          <QRCodeSVG
            value={session.depositAddress}
            size={168}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 text-left">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Next steps:</strong>
            <br />
            1. Send any amount of BTC to the address above
            <br />
            2. Wait for at least 1 network confirmation
            <br />
            3. Funds will be processed and sent to configured destinations
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={onNewOperation}
      >
        New Operation
      </Button>
    </div>
  );
}
