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


    async def fetch_chats(self, profile_id, unread_only=False):

        profile_id_cond = or_(chats_table.c.profile_id1 == profile_id,
                                               chats_table.c.profile_id2 == profile_id)
        unread_cond = True if not unread_only else or_(chats_table.c.is_unread1 == True,
                                                       chats_table.c.is_unread2 == True)

        query = select(columns=[
            chats_table.c.id,
            chats_table.c.profile_id1,
            chats_table.c.profile_id2,
            chats_table.c.messages,
            chats_table.c.is_unread1,
            chats_table.c.is_unread2,
        ]).where(and_(profile_id_cond, unread_cond))

        chats = await self.database.fetch_all(query=query)
        return chats

    async def count_new_messages(self, profile_id):
        new_chats = await self.fetch_chats(profile_id, unread_only=True)
        count_dict = dict()
        for chat in new_chats:
            if chat['profile_id1'] == profile_id and chat['is_unread1']:
                from_ = chat['profile_id2']
                to_ = chat['profile_id1']
            elif chat['profile_id2'] == profile_id and chat['is_unread2']:
                from_ = chat['profile_id1']
                to_ = chat['profile_id2']
            else:
                logger.warning("Count new messages: invalid chat: {chat}")
                continue

            count_dict[from_] = await self._count_new_messages(chat, from_=from_, to_=to_)
        return count_dict

    async def _count_new_messages(self, chat, from_, to_):
        count = 0
        for m in reversed(chat["messages"]):
            if m["fromId"] == from_ and m["toId"] == to_:
                if m["is_new"]:
                    count += 1
                else:
                    break
        return count

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
            'is_unread1': False,
            'is_unread2': False,
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

    async def save_message(self, chat, sender_id, message):
        message.update({'is_new': True})

        messages = chat['messages']
        messages.append(message)
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
        messages = []
        for m in chat['messages']:
            m_dict = dict(m)
            if m_dict['fromId'] != reader_id:
                m_dict['is_new'] = False
            messages.append(m_dict)
        is_unread = 'is_unread1' if chat['profile_id1'] == reader_id else 'is_unread2'
        values = {
           'messages': messages,
           is_unread: False
        }
        query = chats_table.update().where(chats_table.c.id == chat['id']).values(values)
        logger.debug(query)
        await self.database.execute(query)
