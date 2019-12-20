from sqlalchemy import Index

from app import db


class TopProfiles(db.Model):
    __tablename__ = 'geni_top_profiles'
    profileId = db.Column(db.Integer, primary_key=True)
    profileLink = db.Column(db.String(255))
    steps = db.Column(db.Integer)


class GeniProfile(db.Model):
    __tablename__ = 'geni_profiles'
    gid = db.Column(db.Integer, primary_key=True)
    profileId = db.Column(db.String(255))
    profileName = db.Column(db.String(255))
    profileLink = db.Column(db.String(255))
    step = db.Column(db.Integer)
    profiles = db.Column(db.Integer)


class GeniJob(db.Model):
    __tablename__ = 'geni_job'
    jid = db.Column(db.Integer, primary_key=True)
    profileId = db.Column(db.String(255))
    guid = db.Column(db.String(255))
    apiKey = db.Column(db.String(255))
    step = db.Column(db.Integer)
    email = db.Column(db.String(255))
    dbSave = db.Column(db.String(255))
    status = db.Column(db.Integer)


Index('geni_profile_step_profile_index', GeniProfile.profileId, GeniProfile.step)
