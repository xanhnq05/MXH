import { Phone, PhoneOff, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { CallSignalPayload } from "@/hooks/useCall";

interface IncomingCallModalProps {
  incoming: CallSignalPayload | null;
  onAccept: (p: CallSignalPayload) => void;
  onReject: (p: CallSignalPayload) => void;
}

const IncomingCallModal = ({ incoming, onAccept, onReject }: IncomingCallModalProps) => {
  if (!incoming || !incoming.fromUser) return null;
  const { fromUser, type } = incoming;

  return (
    <Dialog open={!!incoming} onOpenChange={(o) => !o && onReject(incoming)}>
      <DialogContent className="max-w-sm text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20 animate-pulse">
              <AvatarImage src={fromUser.avatarUrl} />
              <AvatarFallback className="text-3xl">
                {fromUser.displayName?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2">
              {type === "video" ? (
                <Video className="h-4 w-4" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold">{fromUser.displayName}</h3>
            <p className="text-sm text-muted-foreground">
              Đang gọi {type === "video" ? "video" : "thoại"} cho bạn...
            </p>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700"
              onClick={() => onReject(incoming)}
              title="Từ chối"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              className="rounded-full h-14 w-14 bg-green-600 hover:bg-green-700"
              onClick={() => onAccept(incoming)}
              title="Chấp nhận"
            >
              {type === "video" ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;
