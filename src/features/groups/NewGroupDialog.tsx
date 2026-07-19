import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GroupDialog } from "./GroupDialog";

// Trigger button that opens the shared GroupDialog in create mode.
export function NewGroupDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Yangi guruh
      </Button>
      {open && <GroupDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
