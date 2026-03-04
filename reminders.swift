import EventKit
import Foundation

let store = EKEventStore()

let dispatchGroup = DispatchGroup()
dispatchGroup.enter()

store.requestAccess(to: .reminder) { (granted, error) in
    if granted {
        let predicate = store.predicateForReminders(in: nil)
        store.fetchReminders(matching: predicate, completion: { (reminders) in
            var results: [[String: Any]] = []
            
            if let reminders = reminders {
                for r in reminders {
                    // Only get reminders that are not completed, or completed recently
                    
                    var dict: [String: Any] = [
                        "id": r.calendarItemIdentifier,
                        "title": r.title ?? "",
                        "completed": r.isCompleted,
                        "notes": r.notes ?? "",
                        "listName": r.calendar.title
                    ]
                    
                    if let dueDate = r.dueDateComponents?.date {
                        dict["dueDate"] = ISO8601DateFormatter().string(from: dueDate)
                    }
                    
                    if let completionDate = r.completionDate {
                        dict["completionDate"] = ISO8601DateFormatter().string(from: completionDate)
                    }
                    
                    if r.hasRecurrenceRules {
                        dict["isRecurring"] = true
                    } else {
                        dict["isRecurring"] = false
                    }
                    
                    results.append(dict)
                }
            }
            
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: results, options: .prettyPrinted)
                if let jsonString = String(data: jsonData, encoding: .utf8) {
                    print(jsonString)
                }
            } catch {
                print("{\"error\": \"Failed to serialize JSON\"}")
            }
            
            dispatchGroup.leave()
        })
    } else {
        print("{\"error\": \"Access denied to Reminders\"}")
        dispatchGroup.leave()
    }
}

dispatchGroup.wait()
