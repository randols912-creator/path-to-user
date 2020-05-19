import datetime
from sqlalchemy import Index, ForeignKey
from sqlalchemy.orm import relationship

from app import db


class GeniProfiles(db.Model):
    __tablename__ = 'geni_profiles'

    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.String(255))
    profile_name = db.Column(db.String(255))
    profile_details_link = db.Column(db.String(255))
    is_user = db.Column(db.Boolean, default=True)
    profile = db.Column(db.JSON)


class ProfileToProfile(db.Model):
    __tablename__ = 'profile_to_profile'

    id = db.Column(db.Integer, primary_key=True)
    source_id = db.Column(db.Integer, ForeignKey("geni_profiles.id"), nullable=False)
    target_id = db.Column(db.Integer, ForeignKey("geni_profiles.id"), nullable=False)
    joint_url = db.Column(db.String(500))
    step_count = db.Column(db.Integer)
    profiles_relationship = db.Column(db.String(255))
    profile_relations = db.Column(db.JSON)
    created_on = db.Column(db.DateTime, server_default=db.func.now())
    updated_on = db.Column(db.DateTime, server_default=db.func.now(), server_onupdate=db.func.now())
    finished_on = db.Column(db.DateTime, default=datetime.datetime.min)
    user_profile_id_fk = relationship('GeniProfiles', foreign_keys=[source_id])
    target_profile_id_fk = relationship('GeniProfiles', foreign_keys=[target_id])


Index('profile_to_profile_index', ProfileToProfile.source_id, ProfileToProfile.target_id)


def db_init():
    db.create_all()
    db.session.commit()
