// Isolated browser fixtures only. Never run against the deployed database.
import { writeFile } from "node:fs/promises";
const url=process.env.LEASEO_TEST_DATABASE_URL;
if(!url || !new URL(url).pathname.endsWith("_test"))throw new Error("Dedicated test database required");
process.env.DATABASE_URL=url;
const {pool}=await import("../server/db");
const {generateToken,getAuthUser}=await import("../server/auth");
await pool.query(`UPDATE users SET email_verified_at=now(),profile_completed=true,user_type='tenant'
  WHERE id LIKE 'contact-test-%'`);
await pool.query("UPDATE users SET phone_verified_at=NULL WHERE id='contact-test-b'");
await pool.query("UPDATE notification_configuration SET settings=settings || '{\"whatsappEnabled\":false,\"smsEnabled\":false,\"emailEnabled\":false}'::jsonb WHERE id=1");
for(const [id,title] of [["contact-test-p4","Garden Apartment Test"],["contact-test-p5","Park View Test"],["contact-test-p6","City Studio Test"]]){
  await pool.query(`INSERT INTO properties(id,title,description,address,city,state,price,owner_id,status)
    VALUES($1,$2,'A bright apartment for contact-flow verification.',
    'Test Road','Mumbai','Maharashtra',42000,'contact-test-owner','active') ON CONFLICT DO NOTHING`,[id,title]);
}
const accounts:Record<string,unknown>={};
for(const [label,id] of [["customer","contact-test-a"],["unverified","contact-test-b"],["admin","contact-test-admin"]]){
  const user=await getAuthUser(id);
  if(!user)throw new Error("Run notification integration tests first");
  accounts[label]={user,token:generateToken({userId:id,email:user.email,isAdmin:user.isAdmin})};
}
await writeFile("/tmp/leaseo-contact-browser-auth.json",JSON.stringify(accounts));
console.log("Synthetic browser fixtures written. All notification channels disabled.");
await pool.end();
