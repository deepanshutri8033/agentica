import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CreateAgent from '@/components/custom/agents/createAgent';


function AgentsPage(){
    return(
        <div className="w-full flex justify-center">
            <div className='w-full max-w-3xl px-6 pt-18 pb-16'>
            <Tabs defaultValue="account" className="w-full">
            <TabsList>
                <TabsTrigger value="create-agent">Create Agent</TabsTrigger>
                <TabsTrigger value="my-agent">My Agents</TabsTrigger>
            </TabsList>
            <TabsContent value="create-agent"><CreateAgent/></TabsContent>
            <TabsContent value="my-agent">My Agents</TabsContent>
            </Tabs>
            </div>

        </div>
    )
}

export default AgentsPage;