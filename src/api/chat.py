import sys, os
from sanic.log import logger
from api.models import chats_table, CURRENT_TIMESTAMP
from sqlalchemy import and_, or_, select
from databases import Database
import datetime

class ChatManager:
    def __init__(self, database: Database):
        self.database = database

    async def iterate_chats(self, profile_id):
        query = chats_table.select().where(or_(chats_table.c.profile_id1 == profile_id,
                                               chats_table.c.profile_id2 == profile_id))
        async for row in self.database.iterate(query=query):
            yield row


    async def fetch_chats(self, profile_id):
        query = select(columns=[
            chats_table.c.id,
            chats_table.c.profile_id1,
            chats_table.c.profile_id2,
            chats_table.c.messages,
            chats_table.c.is_unread1,
            chats_table.c.is_unread2,
        ]).where(or_(chats_table.c.profile_id1 == profile_id,
                                               chats_table.c.profile_id2 == profile_id))
        chats = await self.database.fetch_all(query=query)
        return chats


    async def get_chat(self, chat_id):
        query = chats_table.select().where(chats_table.c.id == chat_id)
        chat = await self.database.fetch_one(query=query)
        return chat

    async def get_chat_by_profiles(self, profile_id1, profile_id2):
        query = select(columns=[
            chats_table.c.id,
            chats_table.c.profile_id1,
            chats_table.c.profile_id2,
            chats_table.c.messages,
            chats_table.c.is_unread1,
            chats_table.c.is_unread2,
        ]).where(or_(and_(chats_table.c.profile_id1 == profile_id1,
                          chats_table.c.profile_id2 == profile_id2),
                     and_(chats_table.c.profile_id2 == profile_id1,
                          chats_table.c.profile_id1 == profile_id2)
                     ))
        chat = await self.database.fetch_one(query=query)
        return chat

    async def save_new_chat(self, source_id, target_id):
        chat = await self.get_chat_by_profiles(source_id, target_id)
        values = {
            'is_unread1': True,
            'is_unread2': True,
            'profile_id1': source_id,
            'profile_id2': target_id,
            'messages': [] 

        }
        # Insert or update
        if not chat:
            query = chats_table.insert().values(values)
        else:
            logger.warn(f'Trying to save already existing chat {source_id} - {target_id}')
            return chat['id']
        logger.debug(query)
        return await self.database.execute(query)

    async def save_message(self, chat, sender_id, message_text):
        messages = chat['messages']
        messages.append({
            'sender_id': sender_id,
            'text': message_text,
            'sent_on': datetime.datetime.now(),
            'is_new': True
        })
        # Mark 'unread' in the opposite chatmate field
        is_unread = 'is_unread2' if chat['profile_id1'] == sender_id else 'is_unread1'

        values = {
           'messages': messages,
            is_unread: True
        }
        query = chats_table.update().where(chats_table.c.id == chat['id']).values(values)
        logger.debug(query)
        await self.database.execute(query)

    async def save_read_ack(self, chat, reader_id):
        # Mark all reader's messages as 'read'
        for m in chat['messages']:
            if m['sender_id'] != reader_id:
                m['is_new'] = False
        is_unread = 'is_unread1' if chat['profile_id1'] == reader_id else 'is_unread2'
        values = {
           'messages': chat['messages'],
           is_unread: False
        }
        query = chats_table.update().where(chats_table.c.id == chat['id']).values(values)
        logger.debug(query)
        await self.database.execute(query)
