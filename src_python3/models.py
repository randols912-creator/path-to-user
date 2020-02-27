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


class ProfileToProfile(db.Model):
    __tablename__ = 'profile_to_profile'

    id = db.Column(db.Integer, primary_key=True)
    source_profile_id = db.Column(db.Integer, ForeignKey("geni_profiles.id"), nullable=False)
    target_profile_id = db.Column(db.Integer, ForeignKey("geni_profiles.id"), nullable=False)
    joint_url = db.Column(db.String(255))
    step_count = db.Column(db.Integer)
    profiles_relationship = db.Column(db.String(255))
    profile_relations = db.Column(db.JSON)

    user_profile_id_fk = relationship('GeniProfiles', foreign_keys=[source_profile_id])
    target_profile_id_fk = relationship('GeniProfiles', foreign_keys=[target_profile_id])


Index('profile_to_profile_index', ProfileToProfile.source_profile_id, ProfileToProfile.target_profile_id)


def db_init():
    db.create_all()
    db.session.commit()
