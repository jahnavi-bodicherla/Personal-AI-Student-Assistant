from app.schemas.user import UserProfile


def user_doc_to_profile(doc: dict) -> UserProfile:
    return UserProfile(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        college=doc.get("college"),
        department=doc.get("department"),
        semester=doc.get("semester"),
        profileImage=doc.get("profileImage"),
        preferredSubjects=doc.get("preferredSubjects", []),
        learningGoals=doc.get("learningGoals", []),
        createdAt=doc["createdAt"],
    )
