# RTC Widgets
These are OpenSocial gadgets that can be used on an RTC dashboard in CLM (renamed Engineering Workflow Management in ELM).

# QueryKanban.xml
This widget shows work items from a saved query on a Kanban-like board where stickies can be moved from state to state. You can also single-click a card to see a preview of the work item, open the work item editor, take ownership of the work item, or add a new comment.

# PlansKanban.xml
This file is a skeleton and has no function (yet).

# PlansWorkTrend.xml
Use the settings to select a plan, and this will display a work trend chart, otherwise known as the cumulative value flow chart.

# TeamWorkload4.xml
This widget shows the division of open work items from members of a selected team. The chart is a stacked bar chart, grouping the count of work items by type by the work item owner.

# How to use OpenSocial Gadgets
Because RTC is SSL-enabled, you must host these files over https. To add this to the RTC dashboard, go to the dashboard and click 'Add Widget', then select 'OpenSocial Gadget', and paste the URL to the hosted XML file (e.g. https://myserver/widgets/QueryKanban.xml).

An easy way to host is to zip everything up, change .zip to .war, and add an 'enterprise application' to WebSphere using this war file. Other easy options are to use XAMPP (be sure to enable SSL).
