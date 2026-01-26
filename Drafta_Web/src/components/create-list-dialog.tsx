"use client";

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface CreateListDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string) => void;
}

export const CreateListDialog: React.FC<CreateListDialogProps> = ({ open, onOpenChange, onCreate }) => {
    const [name, setName] = React.useState('');

    // Reset name when dialog opens
    React.useEffect(() => {
        if (open) setName('');
    }, [open]);

    const handleCreate = () => {
        if (name.trim()) {
            onCreate(name.trim());
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New List</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        placeholder="Write the list name."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreate();
                            }
                        }}
                        autoFocus
                    />
                </div>
                <DialogFooter className="flex gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
