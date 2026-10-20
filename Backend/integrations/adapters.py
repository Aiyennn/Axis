"""Map documented fixture subsets into Axis contracts.

These adapters are a mock harness, not complete vendor clients: OAuth,
pagination, Gmail attachment fetching and Notion block traversal come later.
"""
import base64
from datetime import datetime, timezone
from html.parser import HTMLParser

from pydantic import TypeAdapter
from Backend.models.integrations import IntegrationRecord

RECORD = TypeAdapter(IntegrationRecord)


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def text_from_html(value):
    parser = PlainText()
    parser.feed(value or "")
    return " ".join(parser.parts).strip()


def gmail_body(part):
    children = part.get("parts", [])
    if children:
        return "\n".join(filter(None, (gmail_body(child) for child in children)))
    encoded = part.get("body", {}).get("data", "")
    if part.get("mimeType") != "text/plain" or not encoded:
        return ""
    return base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)).decode("utf-8")


def gmail(payload):
    headers = {h["name"].lower(): h["value"] for h in payload["payload"]["headers"]}
    return dict(threadId=payload["threadId"], subject=headers.get("subject", ""),
                sender=headers.get("from", ""), recipients=[headers["to"]] if headers.get("to") else [],
                receivedAt=datetime.fromtimestamp(int(payload["internalDate"]) / 1000, timezone.utc),
                bodyText=gmail_body(payload["payload"]))


def notion(payload):
    properties = payload["properties"]
    due = (properties.get("Due", {}).get("date") or {}).get("start")
    return dict(title="".join(t["plain_text"] for t in properties["Name"]["title"]),
                bodyText="\n".join(t.get("plain_text", "") for block in payload.get("blocks", [])
                                   for t in block.get("paragraph", {}).get("rich_text", [])),
                dueAt=due if due and "T" in due else None,
                dueDate=due if due and "T" not in due else None,
                statusText=(properties.get("Status", {}).get("status") or {}).get("name"),
                properties=properties, sourceUrl=payload.get("url"), updatedAt=payload.get("last_edited_time"))


def github(payload):
    return dict(repository=payload["repository"]["full_name"], number=payload["number"],
                kind="pull_request" if "pull_request" in payload else "issue",
                title=payload["title"], bodyText=payload.get("body") or "", state=payload["state"],
                merged=bool(payload.get("merged", False)),
                labels=[label["name"] for label in payload.get("labels", [])],
                assignees=[person["login"] for person in payload.get("assignees", [])],
                milestoneDueAt=(payload.get("milestone") or {}).get("due_on"),
                sourceUrl=payload.get("html_url"), updatedAt=payload.get("updated_at"))


def canvas(payload):
    submission = payload.get("submission") or {}
    return dict(courseId=str(payload["course_id"]), courseName=payload["course_name"],
                title=payload["name"], descriptionText=text_from_html(payload.get("description")),
                dueAt=payload.get("due_at"), pointsPossible=payload.get("points_possible"),
                submissionStatus=submission.get("workflow_state"), submittedAt=submission.get("submitted_at"),
                sourceUrl=payload.get("html_url"))


def calendar(payload):
    return dict(calendarId=payload["calendar_id"], title=payload.get("summary", "Untitled event"),
                descriptionText=payload.get("description", ""),
                startAt=payload["start"].get("dateTime"), endAt=payload["end"].get("dateTime"),
                startDate=payload["start"].get("date"), endDate=payload["end"].get("date"),
                timezone=payload["start"].get("timeZone"), status=payload.get("status", "confirmed"),
                blocksTime=payload.get("transparency", "opaque") != "transparent",
                recurringEventId=payload.get("recurringEventId"))


def manual(payload):
    return {key: value for key, value in payload.items() if key != "id"}


ADAPTERS = {"gmail": gmail, "notion": notion, "github": github, "canvas": canvas,
            "google_calendar": calendar, "manual": manual}


def adapt(envelope):
    payload = envelope["payload"]
    mapped = ADAPTERS[envelope["integration"]](payload)
    return RECORD.validate_python(dict(
        integration=envelope["integration"], sourceId=str(payload["id"]),
        accountId=envelope["accountId"], fetchedAt=envelope["fetchedAt"], **mapped,
    ))
