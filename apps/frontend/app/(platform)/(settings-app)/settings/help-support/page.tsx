import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function HelpSupportPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Help & Support</h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Submit a Ticket</CardTitle>
                        <CardDescription>
                            Need help with your 180workspace account? Submit a support ticket here.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" placeholder="Brief summary of your issue" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="Provide details about what you need help with..." className="min-h-[150px]" />
                        </div>
                        <Button>Submit Ticket</Button>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Tickets</CardTitle>
                        <CardDescription>
                            Your recently submitted support requests.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground text-center py-8">
                            No recent support tickets found.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
