import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Clock, Facebook, Instagram } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PostSchedulerProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (date: Date) => void;
}

export default function PostScheduler({ open, onClose, onSchedule }: PostSchedulerProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("12:00");

  const handleSchedule = () => {
    if (!date) {
      toast({
        title: "Error",
        description: "Please select a date for scheduling",
        variant: "destructive",
      });
      return;
    }

    // Parse time string and create a new Date object with combined date and time
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes);

    // Validate date is in the future
    if (scheduledDate <= new Date()) {
      toast({
        title: "Error",
        description: "Schedule time must be in the future",
        variant: "destructive",
      });
      return;
    }

    onSchedule(scheduledDate);
    onClose();
    
    toast({
      title: "Post Scheduled",
      description: `Your post will be published to Facebook and Instagram on ${format(scheduledDate, "PPP")} at ${format(scheduledDate, "p")}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Schedule Post</DialogTitle>
          <DialogDescription className="mt-2">
            Your post will be published to both Facebook and Instagram at the scheduled time
            <div className="flex items-center space-x-2 mt-1">
              <Facebook className="h-4 w-4 text-blue-600" />
              <Instagram className="h-4 w-4 text-pink-600" />
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid gap-2">
            <label className="text-sm font-medium">Time</label>
            <div className="flex">
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" className="px-3">
                <Clock className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} className="bg-black text-yellow-400 hover:bg-gray-800">
            Schedule Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}