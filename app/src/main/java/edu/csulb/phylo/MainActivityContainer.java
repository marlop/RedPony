package edu.csulb.phylo;

import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.design.widget.BottomNavigationView;
import android.support.v4.app.FragmentTransaction;
import android.support.v7.app.AppCompatActivity;
import android.view.MenuItem;

/**
 * Created by vietl on 2/21/2018.
 */

public class MainActivityContainer extends AppCompatActivity{
    //Fragments
    HomeFragment homeFragment;
    MapsFragment mapsFragment;
    UploadFragment uploadFragment;
    UserFragment userFragment;
    PinnedFragment pinnedFragment;

    //Variables
    private User user;
    //Activity Constants
    private static final String TAG = "MainActivityContainer";

    /**
     *
     */
    private BottomNavigationView.OnNavigationItemSelectedListener NavItemListen =
            new BottomNavigationView.OnNavigationItemSelectedListener(){
                @Override
                public boolean onNavigationItemSelected(@NonNull MenuItem item) {
                    FragmentTransaction fragmentTransaction = getSupportFragmentManager().beginTransaction();
                    switch (item.getItemId()) {
                        case R.id.change_views:
                            fragmentTransaction.replace(R.id.main_activity_container, mapsFragment);
                            break;

                        case R.id.upload_files:
                            //go to upload_files fragment
                            fragmentTransaction.replace(R.id.main_activity_container, uploadFragment);
                            break;

                        case R.id.home_lobby:
                            fragmentTransaction.replace(R.id.main_activity_container, homeFragment);
                            break;

                        case R.id.website_user:
                            //go to website user
                            fragmentTransaction.replace(R.id.main_activity_container, pinnedFragment);
                            break;

                        case R.id.user_account:
                            //go to user account
                            userFragment.setCurrentUser(user);
                            fragmentTransaction.replace(R.id.main_activity_container, userFragment);
                            break;

                    }
                    FragmentTransaction transaction = getSupportFragmentManager().beginTransaction();
                    //transaction.replace(R.id.container, selectedFragment);
                    transaction.commit();
                    return true;
                }
            };

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main_activity_container);

        //Initialize user
        user = User.getInstance(this);

        //create bottom navigation bar
        createBottomNavigationView();

        //Instantiate fragments
        homeFragment = HomeFragment.newInstance();
        mapsFragment = MapsFragment.newInstance();
        pinnedFragment = PinnedFragment.newInstance();
        uploadFragment = UploadFragment.newInstance();
        userFragment = UserFragment.newInstance();
    }

    /**
     * Creates the bottom navigation for the activity container
     */
    public void createBottomNavigationView() {
        BottomNavigationView bottomNavigationView = findViewById(R.id.bottom_navigation);
        //TODO: What does this do?
        BottomNavigationBarShiftHelp.disableShiftMode(bottomNavigationView);
        bottomNavigationView.setSelectedItemId(R.id.home_lobby);
        bottomNavigationView.setOnNavigationItemSelectedListener(NavItemListen);
        FragmentTransaction transaction = getSupportFragmentManager().beginTransaction();
        transaction.replace(R.id.container, HomeFragment.newInstance());
        //Commit changes transaction
        transaction.commit();
    }
}
