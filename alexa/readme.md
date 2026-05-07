# Alexa Skill Setup — Get Dressed With Wynn

Wynn says: "Alexa, what should I wear today?"
Alexa responds with today's outfit recommendation.

---

## Step 1 — Create the Lambda function on AWS

1. Go to **aws.amazon.com** → sign in
2. Search for **Lambda** in the top search bar
3. Click **Create function**
4. Select **Author from scratch**
5. Fill in:
   - **Function name**: `GetDressedWithWynn`
   - **Runtime**: `Node.js 18.x`
   - **Architecture**: `x86_64`
6. Click **Create function**

### Upload the code
1. In your Lambda function page, scroll to **Code source**
2. Click **Upload from** → **.zip file**
3. Zip the `lambda/` folder (just the `index.js` file inside it) and upload it
4. Make sure the **Handler** is set to `index.handler`

### Add environment variables
In your Lambda function, click **Configuration** → **Environment variables** → **Edit** → **Add**:

| Key | Value |
|-----|-------|
| `API_BASE` | `https://getdressedwithwynn.onrender.com` |
| `API_SECRET` | your API secret (same one from Render) |
| `PROFILE_ID` | `9f5ce827-e236-450f-ae01-618368299f8f` |
| `CHILD_NAME` | `Wynn` |

Click **Save**.

### Set the timeout
1. Click **Configuration** → **General configuration** → **Edit**
2. Set **Timeout** to `15 seconds` (the default 3s is too short)
3. Click **Save**

### Copy the Lambda ARN
At the top right of the Lambda page you'll see the ARN — looks like:
`arn:aws:lambda:us-east-1:123456789:function:GetDressedWithWynn`

Copy it — you'll need it in Step 3.

---

## Step 2 — Create the Alexa Skill

1. Go to **developer.amazon.com/alexa/console/ask**
2. Sign in with your Amazon account
3. Click **Create Skill**
4. Fill in:
   - **Skill name**: `Get Dressed With Wynn`
   - **Primary locale**: `English (US)`
5. Choose **Other** → **Custom** → **Alexa-hosted (Node.js)**

   Actually — choose **Provision your own** since we're using Lambda.

6. Click **Create skill**

### Set the invocation name
1. In the left sidebar click **Invocations** → **Skill Invocation Name**
2. Set it to: `what should i wear`
3. Click **Save Model**

### Add the interaction model
1. In the left sidebar click **JSON Editor**
2. Delete everything in the editor
3. Paste the entire contents of `interaction-model.json`
4. Click **Save Model**
5. Click **Build Model** — wait for it to finish

---

## Step 3 — Connect Alexa to Lambda

1. In the left sidebar click **Endpoint**
2. Select **AWS Lambda ARN**
3. Paste your Lambda ARN into the **Default Region** field
4. Click **Save Endpoints**

### Add Alexa trigger to Lambda
1. Go back to your Lambda function on AWS
2. Click **Add trigger**
3. Select **Alexa Skills Kit**
4. Go back to your Alexa skill → **Endpoint** and copy the **Skill ID** (starts with `amzn1.ask.skill...`)
5. Paste it into the Lambda trigger's **Skill ID** field
6. Click **Add**

---

## Step 4 — Test it

1. In the Alexa Developer Console, click **Test** in the top nav
2. Change the dropdown from **Off** to **Development**
3. Type: `what should i wear today`
4. You should hear/see Alexa respond with Wynn's outfit

---

## Step 5 — Enable on Wynn's Echo

1. Open the **Alexa app** on your phone
2. Go to **More** → **Skills & Games** → **Your Skills** → **Dev**
3. You should see **Get Dressed With Wynn** — tap **Enable**
4. It's now live on all Echo devices linked to your Amazon account

Wynn can now say: **"Alexa, what should I wear today"**

---

## How it works

```
Wynn: "Alexa, what should I wear today"
         ↓
  Alexa Skill (Developer Console)
         ↓
  AWS Lambda (index.js)
         ↓
  GET https://getdressedwithwynn.onrender.com/api/recommendation/{profileId}
         ↓
  Supabase → stored recommendation
         ↓
  Alexa reads alexaScript aloud to Wynn
```

If no recommendation exists yet for today, Lambda automatically triggers a fresh generation before responding.
