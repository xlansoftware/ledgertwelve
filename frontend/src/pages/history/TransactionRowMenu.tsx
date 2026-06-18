import { MoreHorizontal, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import ResponsiveMenu from "@/components/common/responsive/ResponsiveMenu";
import { useState } from "react";
import { toast } from "sonner";
import ConfirmMenuItem from "./ConfirmMenuItem";
import type { TransactionDto } from "@/types";
import { useTransactionsStore } from "@/store";

export default function TransactionRowMenu({
  transaction,
}: {
  transaction: TransactionDto;
}) {
  const deleteTransaction = useTransactionsStore((s) => s.deleteTransaction);
  const [/*edit,*/, setEdit] = useState(false);

  const handleEdit = () => {
    requestAnimationFrame(() => setEdit(true));
  };

  const handleDelete = async () => {
    await deleteTransaction(transaction.id!);
    toast.success("Deleted");
  };

  return (
    <>
      <ResponsiveMenu>
        <ResponsiveMenu.Trigger>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </ResponsiveMenu.Trigger>
        <ResponsiveMenu.Content>
          <ResponsiveMenu.Item onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </ResponsiveMenu.Item>
          <ConfirmMenuItem
            title="Delete item"
            description="Are you sure you want to delete this item?"
            onConfirmed={handleDelete}
          />
        </ResponsiveMenu.Content>
      </ResponsiveMenu>

      {/* {edit && (
        <EditTransactionForm
          transaction={transaction}
          onClose={() => setEdit(false)}
        />
      )} */}
    </>
  );
}
